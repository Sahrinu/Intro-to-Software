import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';

// Attach decoded user to req
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Extracts Bearer token */
function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // decoded has: { userId, email, role }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/** Basic RBAC */
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

/** Owner OR role(s) gate (use for GET/:id and PUT/:id) */
export const authorizeOwnerOr = (
  getOwnerId: (req: Request) => number | null | undefined,
  ...allowedRoles: UserRole[]
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const ownerId = getOwnerId(req);
    const isOwner = typeof ownerId === 'number' && req.user.userId === ownerId;
    const isAllowedRole = allowedRoles.includes(req.user.role);
    if (!isOwner && !isAllowedRole) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

/** Convenience for maintenance admin routes */
export const requireAdminOrMaintenance = authorize(UserRole.ADMIN, UserRole.MAINTENANCE);
