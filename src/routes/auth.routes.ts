import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { dbGet, dbRun } from '../utils/db.utils';
import { UserRole } from '../types';

const router = express.Router();

// Register
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    body('role')
      .optional()
      .isIn([UserRole.STUDENT, UserRole.FACULTY, UserRole.STAFF, UserRole.MAINTENANCE])
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, role = 'student' } = req.body;

      // Check if user exists
      const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const result = await dbRun(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, name, role]
      );

      res.status(201).json({
        message: 'User registered successfully',
        userId: result.lastID
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user: any = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const secret: Secret = process.env.JWT_SECRET||"2afe5539af0e1e43f8dba5d3a4cebb5a0c040466d40a167b6f296b899f7a38b37ad6abea7cfd9b2036ce8d61b1f25369851db4a2598c25a7a54644343e6c2ead";
      const options = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' };
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        // cast to `any` to satisfy varying `jsonwebtoken` type definitions across environments
        secret as any,
        options as any
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;

