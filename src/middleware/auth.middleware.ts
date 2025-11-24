import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Optional authentication - doesn't fail if no token
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      next();
      return;
    }

    const secret = process.env.JWT_SECRET || '2afe5539af0e1e43f8dba5d3a4cebb5a0c040466d40a167b6f296b899f7a38b37ad6abea7cfd9b2036ce8d61b1f25369851db4a2598c25a7a54644343e6c2ead';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
  } catch (error) {
    // Ignore invalid tokens for optional auth
  }
  next();
};

// Middleware to authenticate JWT token to check if user role matches the allowed roles
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const secret = process.env.JWT_SECRET || '2afe5539af0e1e43f8dba5d3a4cebb5a0c040466d40a167b6f296b899f7a38b37ad6abea7cfd9b2036ce8d61b1f25369851db4a2598c25a7a54644343e6c2ead';
    const decoded = jwt.verify(token, secret) as JwtPayload;
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


