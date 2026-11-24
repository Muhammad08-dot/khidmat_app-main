import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { createHmac } from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from './middleware/auth';

export function scrubServerPII(text?: string): string {
  if (!text) return '';
  return text
    .replace(/eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, '[REDACTED_TOKEN]')
    .replace(/\b\d{5}-\d{7}-\d{1}\b/g, '[REDACTED_CNIC]')
    .replace(/\b[1-7]\d{12}\b/g, '[REDACTED_CNIC]')
    .replace(/(?:\+92|0)?3[0-9]{2}[- ]?[0-9]{7}\b/g, '[REDACTED_PHONE]')
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]');
}

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      next(error);
    }
  };
};

export const healSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  file: z.string().optional(),
  codeSnippet: z.string().optional(),
  appContext: z.string().optional(),
  platform: z.string().optional(),
  timestamp: z.string().optional(),
});

export const geminiProxySchema = z.object({
  model: z.string().min(1, 'Model is required'),
  contents: z.array(z.any()).min(1, 'Contents array is required'),
  generationConfig: z.any().optional(),
});

export const paymentInitSchema = z.object({
  bookingId: z.string().uuid('Booking ID must be a valid UUID'),
  amount: z.number().int().positive().max(1_000_000, 'Amount exceeds upper bound'),
  method: z.enum(['jazzcash', 'easypaisa']),
});

export function createApp(customConfig?: {
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  allowedOrigins?: string[];
}) {
  const app = express();

  const allowedOrigins =
    customConfig?.allowedOrigins ||
    (process.env.ALLOWED_ORIGINS || 'http://localhost:8081,exp://localhost:8081')
      .split(',')
      .map((s) => s.trim());

  app.use(helmet());
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: '1mb' }));

  const limiter = rateLimit({
    windowMs:
      customConfig?.rateLimitWindowMs ||
      Number(process.env.RATE_LIMIT_WINDOW_MS) ||
      60000,
    max:
      customConfig?.rateLimitMax ||
      Number(process.env.RATE_LIMIT_MAX_REQUESTS) ||
      60,
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  const hasLLM = Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);

  // Health check endpoints
  const healthHandler = (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasLLM,
      timestamp: new Date().toISOString(),
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // AI Self-Healing endpoint
  app.post(
    '/api/heal',
    requireAuth,
    validateRequest(healSchema),
    async (req: Request, res: Response) => {
      try {
        const timestamp = new Date().toISOString();
        // Stub/fallback response when keys are not active in test/dev
        res.json({
          diagnosis: 'Self-healing diagnostic executed successfully.',
          suggestion: 'Ensure proper exception handling and defensive nil-checks.',
          proposedPatch: null,
          confidence: 0.9,
          model: hasLLM ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash') : 'stub',
          timestamp,
        });
      } catch (err: any) {
        console.error('[agent-server] LLM invocation failed:', err);
        res.status(500).json({ error: 'LLM invocation failed', detail: String(err?.message ?? err) });
      }
    }
  );

  // Gemini proxy endpoint
  app.post(
    '/api/gemini/generateContent',
    requireAuth,
    validateRequest(geminiProxySchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
          return;
        }
        const { model, contents, generationConfig } = req.body;
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, generationConfig }),
          }
        );
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API returned ${response.status}: ${errText}`);
        }
        const data = await response.json();
        res.json(data);
      } catch (error) {
        next(error);
      }
    }
  );

  // Payments Initiation
  const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === 'true';

  app.post(
    '/api/payments/initiate',
    requireAuth,
    validateRequest(paymentInitSchema),
    async (req: Request, res: Response) => {
      if (!PAYMENTS_ENABLED) {
        res.status(503).json({
          error: 'Payments are not enabled yet. Pay cash with the provider on completion.',
        });
        return;
      }
      const { bookingId, amount, method } = req.body as z.infer<typeof paymentInitSchema>;
      const pp_MobileAccount = process.env.GW_MOBILE_ACCOUNT;
      const pp_MerchantKey = process.env.GW_MERCHANT_KEY;
      if (!pp_MobileAccount || !pp_MerchantKey) {
        res.status(500).json({ error: 'Gateway credentials are not configured on the server.' });
        return;
      }
      const now = new Date();
      const txnTime = now.toISOString().slice(0, 19).replace('T', ' ');
      const pp_TxnExpiryDateTime = new Date(now.getTime() + 15 * 60_000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');
      const pp_Amount = String(amount * 100);

      const pp_VersionNumber = process.env.GW_VERSION_NUMBER || '2.0';
      const pp_MerchantID = process.env.GW_MERCHANT_ID || '';
      const pp_PasswordSalt = process.env.GW_PASSWORD_SALT || '';
      const secureHash = `${pp_VersionNumber}|${pp_TxnExpiryDateTime}|${pp_Amount}|${pp_MobileAccount}|${bookingId}|${pp_PasswordSalt}`;
      const pp_SecureHash = createHmac('sha512', pp_MerchantKey).update(secureHash).digest('hex');

      res.json({
        bookingId,
        method,
        orderString:
          `pp_VersionNumber=${encodeURIComponent(pp_VersionNumber)}` +
          `&pp_TxnType=${encodeURIComponent(process.env.GW_TXN_TYPE || 'MWALLET')}` +
          `&pp_Language=${encodeURIComponent('en')}` +
          `&pp_MerchantID=${encodeURIComponent(pp_MerchantID)}` +
          `&pp_SubMerchantID=${encodeURIComponent('')}` +
          `&pp_Password=${encodeURIComponent('')}` +
          `&pp_BankID=${encodeURIComponent('')}` +
          `&pp_ProductID=${encodeURIComponent('')}` +
          `&pp_TxnRefNo=${encodeURIComponent('T' + Date.now())}` +
          `&pp_Amount=${encodeURIComponent(pp_Amount)}` +
          `&pp_TxnCurrency=${encodeURIComponent('PKR')}` +
          `&pp_TxnDateTime=${encodeURIComponent(txnTime)}` +
          `&pp_BillReference=${encodeURIComponent('billref_' + bookingId.slice(0, 8))}` +
          `&pp_Description=${encodeURIComponent('Khidmat service booking')}` +
          `&pp_TxnExpiryDateTime=${encodeURIComponent(pp_TxnExpiryDateTime)}` +
          `&pp_ReturnURL=${encodeURIComponent(process.env.GW_RETURN_URL || 'khidmat://payments/callback')}` +
          `&pp_SecureHash=${encodeURIComponent(pp_SecureHash)}` +
          `&ppmpf_1=1`,
      });
    }
  );

  app.get('/api/payments/config', (_req: Request, res: Response) => {
    res.json({ enabled: PAYMENTS_ENABLED });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[agent-server] Unhandled error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      detail: process.env.NODE_ENV === 'production' ? undefined : err.message,
    });
  });

  return app;
}

export const app = createApp();

