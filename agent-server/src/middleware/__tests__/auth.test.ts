import jwt from 'jsonwebtoken';
import { requireAuth } from '../auth';

describe('agent-server requireAuth JWT Middleware (P3-6)', () => {
  const secret = 'test-supabase-jwt-secret-for-agent-server';
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SUPABASE_JWT_SECRET: secret,
      SUPABASE_JWT_AUDIENCE: 'authenticated',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createMockReqRes = (authHeader?: string) => {
    const req: any = {
      headers: {
        authorization: authHeader,
      },
    };
    const res: any = {
      statusCode: 200,
      jsonData: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.jsonData = data;
        return this;
      },
    };
    const next = jest.fn();
    return { req, res, next };
  };

  it('allows valid JWT with correct secret and audience', () => {
    const token = jwt.sign({ sub: 'user-123', role: 'authenticated' }, secret, {
      audience: 'authenticated',
      expiresIn: '1h',
    });
    const { req, res, next } = createMockReqRes(`Bearer ${token}`);

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.sub).toBe('user-123');
    expect(res.statusCode).toBe(200);
  });

  it('rejects missing Authorization header with 401', () => {
    const { req, res, next } = createMockReqRes(undefined);

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.jsonData.error).toContain('Missing or invalid Authorization header');
  });

  it('rejects expired JWT with 401', () => {
    const expiredToken = jwt.sign({ sub: 'user-123' }, secret, {
      audience: 'authenticated',
      expiresIn: -10, // already expired
    });
    const { req, res, next } = createMockReqRes(`Bearer ${expiredToken}`);

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.jsonData.error).toContain('Token expired');
  });

  it('rejects token with wrong audience with 401', () => {
    const wrongAudToken = jwt.sign({ sub: 'user-123' }, secret, {
      audience: 'wrong-audience',
      expiresIn: '1h',
    });
    const { req, res, next } = createMockReqRes(`Bearer ${wrongAudToken}`);

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.jsonData.error).toContain('Invalid token');
  });

  it('returns 500 when server SUPABASE_JWT_SECRET is missing', () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const token = jwt.sign({ sub: 'user-123' }, secret);
    const { req, res, next } = createMockReqRes(`Bearer ${token}`);

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.jsonData.error).toContain('Server authentication misconfigured');
  });
});
