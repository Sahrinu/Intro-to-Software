import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function extractTokenFromRequest(req: any): string | undefined {
  const authHeader = (req.headers.authorization || req.headers.Authorization) as string | undefined;
  if (authHeader) {
    const m = authHeader.match(/Bearer\s+(.+)/i);
    if (m && m[1]) return m[1].replace(/\s+/g, '').trim();
  }

  const xToken = req.headers['x-access-token'] || req.headers['x-auth-token'];
  if (typeof xToken === 'string') return xToken.replace(/\s+/g, '').trim();

  if (req.query && req.query.token) return String(req.query.token).replace(/\s+/g, '').trim();
  if (req.body && req.body.token) return String(req.body.token).replace(/\s+/g, '').trim();

  return undefined;
}

export function optionalAuth(req: any, _res: any, next: any) {
  const token = extractTokenFromRequest(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload as any;
  } catch { /* ignore bad/expired token */ }
  next();
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = extractTokenFromRequest(req);

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};


