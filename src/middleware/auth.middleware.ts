import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || '2afe5539af0e1e43f8dba5d3a4cebb5a0c040466d40a167b6f296b899f7a38b37ad6abea7cfd9b2036ce8d61b1f25369851db4a2598c25a7a54644343e6c2ead';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Helper function to extract token from various sources
function extractTokenFromRequest(req: Request): string | undefined {
  const authHeader = req.headers.authorization || req.headers['Authorization'];
  if (authHeader && typeof authHeader === 'string') {
    const match = authHeader.match(/Bearer\s+(.+)/i);
    if (match && match[1]) return match[1].trim();
  }

  const xToken = req.headers['x-access-token'] || req.headers['x-auth-token'];
  if (typeof xToken === 'string') return xToken.trim();

  if (req.query && req.query.token) return String(req.query.token).trim();
  if (req.body && req.body.token) return String(req.body.token).trim();

  return undefined;
}

// Optional authentication - doesn't fail if no token
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractTokenFromRequest(req);
  if (!token) {
    next();
    return;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
  } catch (error) {
    // Ignore invalid tokens for optional auth
  }
  next();
};

// Middleware to authenticate JWT token
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


