// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';

// Optional: export a typed request for convenience elsewhere
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Extracts the bearer token from Authorization header.
 */
function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

/**
 * Normalize roles to lowercase to match DB seeds (admin, maintenance, student, ...)
 */
function normalizeRole(role: string): UserRole {
  return role.toLowerCase() as UserRole;
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

    // Ensure role is normalized (important for RBAC checks)
    decoded.role = normalizeRole(decoded.role);

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Basic role-based authorization.
 * Usage: authorize('admin','maintenance')
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  // normalize the allowed roles once
  const allowed = allowedRoles.map(normalizeRole);
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const userRole = normalizeRole(req.user.role);
    if (!allowed.includes(userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

/**
 * Owner-or-role authorization.
 * Lets the resource owner OR any of the allowed roles proceed.
 *
 * Example in maintenance routes (after loading the item):
 *   const item = await svc.getRequest(id);
 *   if (!item) return res.status(404).json({ message: 'Not found' });
 *   res.locals.ownerId = item.user_id;
 *   // then use:
 *   authorizeOwnerOr(() => res.locals.ownerId, 'admin','maintenance')
 */
export const authorizeOwnerOr = (
  getOwnerId: (req: Request) => number | null | undefined,
  ...allowedRoles: UserRole[]
) => {
  const allowed = allowedRoles.map(normalizeRole);
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const userRole = normalizeRole(req.user.role);
    const ownerId = getOwnerId(req);
    const isOwner = typeof ownerId === 'number' && req.user.id === ownerId;
    const isAllowedRole = allowed.includes(userRole);

    if (isOwner || isAllowedRole) {
      return next();
    }
    res.status(403).json({ error: 'Insufficient permissions' });
  };
};

/** Convenience guard for common case in Maintenance module */
export const requireAdminOrMaintenance = authorize('admin', 'maintenance');
