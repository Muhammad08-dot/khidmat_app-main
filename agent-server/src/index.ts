import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { createHmac } from "crypto";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAuth } from "./middleware/auth";

const PORT = Number(process.env.PORT) || 8787;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:8081,exp://localhost:8081").split(",");

const hasLLM = !!(OPENAI_API_KEY || GEMINI_API_KEY);

const app = express();

app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: "1mb" }));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 60,
  message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
        return;
      }
      next(error);
    }
  };
};

const healSchema = z.object({
  message: z.string().min(1),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  file: z.string().optional(),
  codeSnippet: z.string().optional(),
  appContext: z.string().optional(),
  platform: z.string().optional(),
  timestamp: z.string().optional()
});

const geminiProxySchema = z.object({
  model: z.string().min(1),
  contents: z.array(z.any()),
  generationConfig: z.any().optional()
});

interface HealPayload {
  message: string;
  stack?: string;
  componentStack?: string;
  file?: string;
  codeSnippet?: string;
  appContext?: string;
  platform?: string;
  timestamp?: string;
}

interface HealResponse {
  diagnosis: string;
  suggestion: string;
  proposedPatch: string | null;
  confidence: number;
  model: string;
  timestamp: string;
}

const SYSTEM_PROMPT = `You are a senior React Native / Expo engineer embedded in the Khidmat mobile app's self-healing pipeline.

When a crash report arrives, you:
1. Read the stack trace and error message carefully.
2. Identify the root cause — which file, which function, what condition triggered it.
3. Suggest a concrete fix (code patch when possible).
4. Rate your confidence 0.0–1.0.

Respond ONLY with valid JSON in this exact shape:
{
  "diagnosis": "<one-paragraph root-cause analysis>",
  "suggestion": "<short actionable fix description>",
  "proposedPatch": "<TypeScript/JSX code patch snippet, or null if unclear>",
  "confidence": <0.0–1.0>
}`;

function buildPrompt(payload: HealPayload): string {
  const parts: string[] = [];
  parts.push(`Error message: ${payload.message}`);
  if (payload.stack) parts.push(`Stack trace:\n${payload.stack}`);
  if (payload.componentStack) parts.push(`Component stack:\n${payload.componentStack}`);
  if (payload.file) parts.push(`File: ${payload.file}`);
  if (payload.codeSnippet) parts.push(`Code snippet:\n${payload.codeSnippet}`);
  if (payload.appContext) parts.push(`App context: ${payload.appContext}`);
  if (payload.platform) parts.push(`Platform: ${payload.platform}`);
  return parts.join("\n\n");
}

function parseLLMOutput(raw: string, model: string, timestamp: string): HealResponse {
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const obj = JSON.parse(cleaned);
    return {
      diagnosis: obj.diagnosis ?? "Unable to parse diagnosis.",
      suggestion: obj.suggestion ?? "No suggestion available.",
      proposedPatch: obj.proposedPatch ?? null,
      confidence: typeof obj.confidence === "number" ? obj.confidence : 0.5,
      model,
      timestamp,
    };
  } catch {
    return {
      diagnosis: raw,
      suggestion: "See diagnosis for details.",
      proposedPatch: null,
      confidence: 0.3,
      model,
      timestamp,
    };
  }
}

async function callLLM(payload: HealPayload): Promise<HealResponse> {
  const timestamp = new Date().toISOString();
  if (!hasLLM) {
    return {
      diagnosis: "No LLM API key configured.",
      suggestion: "Stub response. Configure API keys.",
      proposedPatch: null,
      confidence: 0,
      model: "stub",
      timestamp,
    };
  }
  const prompt = buildPrompt(payload);
  if (OPENAI_API_KEY) {
    const { ChatOpenAI } = await import("@langchain/openai");
    const { HumanMessage, SystemMessage } = await import("@langchain/core/messages");
    const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.2, apiKey: OPENAI_API_KEY });
    const res = await llm.invoke([new SystemMessage(SYSTEM_PROMPT), new HumanMessage(prompt)]);
    const text = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    return parseLLMOutput(text, "gpt-4o-mini", timestamp);
  }
  if (GEMINI_API_KEY) {
    const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
    const { HumanMessage, SystemMessage } = await import("@langchain/core/messages");
    const llm = new ChatGoogleGenerativeAI({ model: "gemini-1.5-flash", temperature: 0.2, apiKey: GEMINI_API_KEY });
    const res = await llm.invoke([new SystemMessage(SYSTEM_PROMPT), new HumanMessage(prompt)]);
    const text = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    return parseLLMOutput(text, "gemini-1.5-flash", timestamp);
  }
  throw new Error("Unexpected code path.");
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", hasLLM, timestamp: new Date().toISOString() });
});

app.post("/api/heal", validateRequest(healSchema), async (req, res, next) => {
  try {
    const result = await callLLM(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("[agent-server] LLM call failed:", err?.message ?? err);
    res.status(500).json({ error: "LLM invocation failed", detail: String(err?.message ?? err) });
  }
});

app.post("/api/gemini/generateContent", validateRequest(geminiProxySchema), async (req, res, next) => {
  try {
    if (!GEMINI_API_KEY) {
      res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
      return;
    }
    const { model, contents, generationConfig } = req.body;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, generationConfig })
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
});

// ── Payments (JazzCash / EasyPaisa wallet initiation) ────────────────────
// Gated behind PAYMENTS_ENABLED + merchant credentials that live ONLY here,
// never in the mobile bundle. Returns an order string the client hands to the
// gateway SDK/app link. Signature algorithm follows the JazzCash server-to-
// server spec (SHA-512 HMAC over the sorted payload).
const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === "true";

const paymentInitSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().int().positive().max(1_000_000), // PKR, sane upper bound
  method: z.enum(["jazzcash", "easypaisa"]),
});

app.post("/api/payments/initiate", requireAuth, validateRequest(paymentInitSchema), async (req, res) => {
  if (!PAYMENTS_ENABLED) {
    res.status(503).json({ error: "Payments are not enabled yet. Pay cash with the provider on completion." });
    return;
  }
  const { bookingId, amount, method } = req.body as z.infer<typeof paymentInitSchema>;
  const pp_MobileAccount = process.env.GW_MOBILE_ACCOUNT;
  const pp_MerchantKey = process.env.GW_MERCHANT_KEY;
  if (!pp_MobileAccount || !pp_MerchantKey) {
    res.status(500).json({ error: "Gateway credentials are not configured on the server." });
    return;
  }
  const now = new Date();
  const txnTime = now.toISOString().slice(0, 19).replace("T", " ");
  const pp_TxnExpiryDateTime = new Date(now.getTime() + 15 * 60_000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const pp_Amount = String(amount * 100); // pasis (1/100 PKR)

  // Gateway-specific constants; provided once merchant accounts are issued.
  const pp_VersionNumber = process.env.GW_VERSION_NUMBER || "2.0";
  const pp_MerchantID = process.env.GW_MERCHANT_ID || "";
  const pp_PasswordSalt = process.env.GW_PASSWORD_SALT || "";
  const secureHash = `${pp_VersionNumber}|${pp_TxnExpiryDateTime}|${pp_Amount}|${pp_MobileAccount}|${bookingId}|${pp_PasswordSalt}`;
  const pp_SecureHash = createHmac("sha256", pp_MerchantKey).update(secureHash).digest("hex");

  res.json({
    bookingId,
    method,
    orderString:
      `pp_VersionNumber=${encodeURIComponent(pp_VersionNumber)}` +
      `&pp_TxnType=${encodeURIComponent(process.env.GW_TXN_TYPE || "MWALLET")}` +
      `&pp_Language=${encodeURIComponent("en")}` +
      `&pp_MerchantID=${encodeURIComponent(pp_MerchantID)}` +
      `&pp_SubMerchantID=${encodeURIComponent("")}` +
      `&pp_Password=${encodeURIComponent("")}` +
      `&pp_BankID=${encodeURIComponent("")}` +
      `&pp_ProductID=${encodeURIComponent("")}` +
      `&pp_TxnRefNo=${encodeURIComponent("T" + Date.now())}` +
      `&pp_Amount=${encodeURIComponent(pp_Amount)}` +
      `&pp_TxnCurrency=${encodeURIComponent("PKR")}` +
      `&pp_TxnDateTime=${encodeURIComponent(txnTime)}` +
      `&pp_BillReference=${encodeURIComponent("billref_" + bookingId.slice(0, 8))}` +
      `&pp_Description=${encodeURIComponent("Khidmat service booking")}` +
      `&pp_TxnExpiryDateTime=${encodeURIComponent(pp_TxnExpiryDateTime)}` +
      `&pp_ReturnURL=${encodeURIComponent(process.env.GW_RETURN_URL || "khidmat://payments/callback")}` +
      `&pp_SecureHash=${encodeURIComponent(pp_SecureHash)}` +
      `&ppmpf_1=1`,
  });
});

app.get("/api/payments/config", (_req, res) => {
  res.json({ enabled: PAYMENTS_ENABLED });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[agent-server] Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    detail: process.env.NODE_ENV === "production" ? undefined : err.message
  });
});

app.listen(PORT, () => {
  console.log(`\n🤖 Khidmat Agent Server listening on port ${PORT}\n`);
});