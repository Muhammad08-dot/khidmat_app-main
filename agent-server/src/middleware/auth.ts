import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const getJwtSecret = () => process.env.SUPABASE_JWT_SECRET;
const getJwtAudience = () => process.env.SUPABASE_JWT_AUDIENCE || 'authenticated';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const secret = getJwtSecret();

  if (!secret) {
    console.error('SUPABASE_JWT_SECRET is not configured');
    return res.status(500).json({ error: 'Server authentication misconfigured' });
  }

  try {
    const audience = getJwtAudience();
    const decoded = jwt.verify(token, secret, { audience });
    // Attach the user's Supabase ID to the request
    (req as any).user = decoded;
    next();
  } catch (error: any) {
    if (error?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', detail: error.message });
    }
    if (error?.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token', detail: error.message });
    }
    console.error('JWT Verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
