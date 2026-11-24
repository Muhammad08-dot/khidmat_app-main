import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';

const TEST_SECRET = 'test-supabase-jwt-secret-1234567890';
process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';
process.env.ALLOWED_ORIGINS = 'http://localhost:8081,exp://localhost:8081';

describe('Khidmat Agent Server Test Suite (P3-6)', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    const app = createApp({
      allowedOrigins: ['http://localhost:8081', 'exp://localhost:8081'],
    });

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => {
    server.close();
  });

  const generateToken = (payload: object, options?: jwt.SignOptions) => {
    return jwt.sign(payload, TEST_SECRET, {
      audience: 'authenticated',
      expiresIn: '1h',
      ...options,
    });
  };

  describe('Health Endpoints', () => {
    it('GET /health returns 200 with status ok', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
      assert.ok(data.timestamp);
    });

    it('GET /api/health returns 200 with status ok', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
    });
  });

  describe('JWT Authentication Validation', () => {
    it('rejects requests with missing Authorization header (401)', async () => {
      const res = await fetch(`${baseUrl}/api/heal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Crash report' }),
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error, 'Missing or invalid Authorization header');
    });

    it('rejects requests with expired JWT token (401)', async () => {
      const expiredToken = jwt.sign({ sub: 'user-expired' }, TEST_SECRET, {
        audience: 'authenticated',
        expiresIn: '-10s',
      });

      const res = await fetch(`${baseUrl}/api/heal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${expiredToken}`,
        },
        body: JSON.stringify({ message: 'Crash report' }),
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error, 'Token expired');
    });

    it('rejects requests with wrong audience (401)', async () => {
      const wrongAudToken = jwt.sign({ sub: 'user-wrong-aud' }, TEST_SECRET, {
        audience: 'wrong-audience',
        expiresIn: '1h',
      });

      const res = await fetch(`${baseUrl}/api/heal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wrongAudToken}`,
        },
        body: JSON.stringify({ message: 'Crash report' }),
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error, 'Invalid token');
    });

    it('rejects requests signed with wrong secret (401)', async () => {
      const invalidToken = jwt.sign({ sub: 'user-invalid' }, 'wrong-secret-key-12345', {
        audience: 'authenticated',
        expiresIn: '1h',
      });

      const res = await fetch(`${baseUrl}/api/heal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${invalidToken}`,
        },
        body: JSON.stringify({ message: 'Crash report' }),
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error, 'Invalid token');
    });

    it('accepts valid JWT token and processes request (200)', async () => {
      const validToken = generateToken({ sub: 'user-valid', role: 'authenticated' });

      const res = await fetch(`${baseUrl}/api/heal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({ message: 'Component render exception' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.diagnosis);
      assert.strictEqual(typeof data.confidence, 'number');
    });
  });

  describe('Zod Input Validation', () => {
    it('rejects invalid payload missing required message field (400)', async () => {
      const validToken = generateToken({ sub: 'user-valid' });

      const res = await fetch(`${baseUrl}/api/heal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({ stack: 'at foo.js:12:1' }), // message is missing
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'Validation failed');
      assert.ok(Array.isArray(data.details));
    });
  });

  describe('CORS Restrictions', () => {
    it('permits configured allowed origins', async () => {
      const res = await fetch(`${baseUrl}/health`, {
        headers: { Origin: 'http://localhost:8081' },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), 'http://localhost:8081');
    });

    it('restricts unconfigured unauthorized origins', async () => {
      const res = await fetch(`${baseUrl}/health`, {
        headers: { Origin: 'http://malicious-site.example' },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
    });
  });

  describe('Rate Limiting', () => {
    it('throttles requests when rate limit threshold is exceeded (429)', async () => {
      // Create a dedicated server instance with strict rate limits
      const strictApp = createApp({
        rateLimitMax: 3,
        rateLimitWindowMs: 10000,
      });

      const strictServer = http.createServer(strictApp);
      await new Promise<void>((resolve) => strictServer.listen(0, '127.0.0.1', resolve));
      const port = (strictServer.address() as { port: number }).port;
      const targetUrl = `http://127.0.0.1:${port}/health`;

      try {
        const res1 = await fetch(targetUrl);
        const res2 = await fetch(targetUrl);
        const res3 = await fetch(targetUrl);
        assert.strictEqual(res1.status, 200);
        assert.strictEqual(res2.status, 200);
        assert.strictEqual(res3.status, 200);

        // 4th request must exceed max 3 and return 429
        const res4 = await fetch(targetUrl);
        assert.strictEqual(res4.status, 429);
      } finally {
        strictServer.close();
      }
    });
  });
});

