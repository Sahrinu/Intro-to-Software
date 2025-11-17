import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { dbGet, dbAll, dbRun } from '../utils/db.utils';
import { UserRole } from '../types';

const router = express.Router();

// Get all bookings
router.get('/', authenticate, async (req: Request & { user?: any }, res: Response) => {
  try {
    let bookings;
    
    // Admins and staff can see all bookings
    if (req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.STAFF) {
      bookings = await dbAll(`
        SELECT b.*, u.name as user_name, u.email as user_email
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        ORDER BY b.created_at DESC
      `);
    } else {
      // Users can only see their own bookings
      bookings = await dbAll(`
        SELECT b.*, u.name as user_name, u.email as user_email
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
      `, [req.user!.userId]);
    }

    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get booking by ID
router.get('/:id', authenticate, async (req: Request & { user?: any }, res: Response) => {
  try {
    const booking: any = await dbGet(`
      SELECT b.*, u.name as user_name, u.email as user_email
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `, [req.params.id]);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Users can only see their own bookings unless admin/staff
    if (req.user!.role !== UserRole.ADMIN && 
        req.user!.role !== UserRole.STAFF && 
        booking.user_id !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(booking);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create booking
router.post('/',
  authenticate,
  [
    body('resource_type').trim().notEmpty(),
    body('resource_name').trim().notEmpty(),
    body('start_time').isISO8601(),
    body('end_time').isISO8601()
  ],
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { resource_type, resource_name, start_time, end_time } = req.body;

      // Check for conflicts
      const conflicts = await dbAll(`
        SELECT id FROM bookings
        WHERE resource_name = ? AND status != 'rejected'
        AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
      `, [resource_name, start_time, start_time, end_time, end_time]);

      if (conflicts.length > 0) {
        return res.status(409).json({ error: 'Time slot already booked' });
      }

      const result = await dbRun(
        `INSERT INTO bookings (user_id, resource_type, resource_name, start_time, end_time, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [req.user!.userId, resource_type, resource_name, start_time, end_time]
      );

      const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [result.lastID]);
      res.status(201).json(booking);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update booking (user or admin/staff only)
router.put('/:id',
  authenticate,
  [
    body('resource_type').optional().trim().notEmpty(),
    body('resource_name').optional().trim().notEmpty(),
    body('start_time').optional().isISO8601(),
    body('end_time').optional().isISO8601()
  ],
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const booking: any = await dbGet('SELECT * FROM bookings WHERE id = ?', [req.params.id]);

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Check permissions - user can edit their own, admins/staff can edit any
      if (req.user!.role !== UserRole.ADMIN && 
          req.user!.role !== UserRole.STAFF && 
          booking.user_id !== req.user!.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updates: any = {};
      if (req.body.resource_type) updates.resource_type = req.body.resource_type;
      if (req.body.resource_name) updates.resource_name = req.body.resource_name;
      if (req.body.start_time) updates.start_time = req.body.start_time;
      if (req.body.end_time) updates.end_time = req.body.end_time;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updates), req.params.id];

      await dbRun(`UPDATE bookings SET ${setClause} WHERE id = ?`, values);

      const updatedBooking = await dbGet('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
      res.json(updatedBooking);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update booking status (admin/staff only)
router.patch('/:id/status',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.STAFF),
  [
    body('status').isIn(['pending', 'approved', 'rejected', 'completed'])
  ],
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status } = req.body;
      await dbRun('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);

      const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete booking
router.delete('/:id', authenticate, async (req: Request & { user?: any }, res: Response) => {
  try {
    const booking: any = await dbGet('SELECT * FROM bookings WHERE id = ?', [req.params.id]);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Users can only delete their own bookings unless admin
    if (req.user!.role !== UserRole.ADMIN && booking.user_id !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dbRun('DELETE FROM bookings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Booking deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;


