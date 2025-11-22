import express, { Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { dbGet, dbAll } from '../utils/db.utils';
import { UserRole } from '../types';

const router = express.Router();

// Get current user profile
router.get('/me', authenticate, async (req: Request & { user?: any }, res: Response) => {
  try {
    const user: any = await dbGet(
      'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
      [req.user!.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get maintenance staff (admin or maintenance)
router.get('/maintenance-staff', authenticate, authorize(UserRole.ADMIN, UserRole.MAINTENANCE), async (_req: Request, res: Response) => {
  try {
    const staff = await dbAll(
      'SELECT id, email, name, role FROM users WHERE role = ?',
      [UserRole.MAINTENANCE]
    );
    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (admin only)
router.get('/', authenticate, authorize(UserRole.ADMIN), async (req: Request & { user?: any }, res: Response) => {
  try {
    const users = await dbAll(
      'SELECT id, email, name, role, created_at FROM users'
    );
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req: Request & { user?: any }, res: Response) => {
  try {
    const user: any = await dbGet(
      'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Users can only see their own profile unless they're admin
    if (req.user!.role !== UserRole.ADMIN && req.user!.userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

