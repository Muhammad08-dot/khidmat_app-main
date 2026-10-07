import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  if (!SUPABASE_JWT_SECRET) {
    console.error('SUPABASE_JWT_SECRET is not configured');
    return res.status(500).json({ error: 'Server authentication misconfigured' });
  }

  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
    // Attach the user's Supabase ID to the request
    (req as any).user = decoded;
    next();
  } catch (error) {
    console.error('JWT Verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
