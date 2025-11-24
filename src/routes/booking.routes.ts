import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';
import { dbGet, dbAll, dbRun } from '../utils/db.utils';
import { UserRole } from '../types';

const router = express.Router();

// Helper: consistent overlap rule
import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';
import { dbGet, dbAll, dbRun } from '../utils/db.utils';
import { UserRole } from '../types';

const router = express.Router();

// Helper: consistent overlap rule
function isStartBeforeEnd(start: string, end: string) {
  return new Date(start) < new Date(end);
}

// GET /api/bookings
router.get('/', optionalAuth, async (req: Request & { user?: any }, res: Response) => {
  const role = req.user?.role as UserRole | undefined;
  const isPrivileged = role === UserRole.ADMIN || role === UserRole.STAFF;

  // PUBLIC behavior: if not logged in, return safe/public list (Option C)
  if (!req.user) {
    const rows = await dbAll(`
      SELECT id, resource_type, resource_name, start_time, end_time, status
      FROM bookings
      WHERE status = 'approved'
      ORDER BY start_time ASC
    `, []);
    return res.json(rows);
  }

  const sql = `
    SELECT b.*, u.name as user_name, u.email as user_email
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    ${isPrivileged ? '' : 'WHERE b.user_id = ?'}
    ORDER BY b.created_at DESC
  `;
  const args = isPrivileged ? [] : [req.user!.userId];
  const bookings = await dbAll(sql, args);
  res.json(bookings);
});

// GET /api/bookings/availability
router.get('/availability', optionalAuth, async (req: Request, res: Response) => { /* unchanged */ });

// GET /api/bookings/:id
router.get('/:id', optionalAuth, async (req: Request & { user?: any }, res: Response) => {
  const booking: any = await dbGet(`
    SELECT b.*, u.name as user_name, u.email as user_email
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ?
  `, [req.params.id]);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const role = req.user?.role as UserRole | undefined;
  const isPrivileged = role === UserRole.ADMIN || role === UserRole.STAFF;

  if (!req.user) {
    if (booking.status === 'approved') {
      const { id, resource_type, resource_name, start_time, end_time, status } = booking;
      return res.json({ id, resource_type, resource_name, start_time, end_time, status });
    }
    return res.status(403).json({ error: 'Access denied' });
  }

  if (isPrivileged || booking.user_id === req.user.userId) return res.json(booking);
  return res.status(403).json({ error: 'Access denied' });
});


// POST /api/bookings (create)
router.post('/',
  authenticate,
  [
    body('resource_type').trim().notEmpty(),
    body('resource_name').trim().notEmpty(),
    body('start_time').isISO8601(),
    body('end_time').isISO8601(),
    body('reason').optional().isString().isLength({ max: 500 }),
    body('user_id').optional().isInt({ gt: 0 }),
  ],
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { resource_type, resource_name, start_time, end_time, reason, user_id } = req.body;

      if (!isStartBeforeEnd(start_time, end_time)) {
        return res.status(400).json({ error: 'start_time must be before end_time' });
      }

      const isPrivileged = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.STAFF;
      const targetUserId = isPrivileged && user_id ? Number(user_id) : req.user!.userId;

      const conflicts = await dbAll(`
        SELECT id FROM bookings
        WHERE resource_name = ?
          AND status IN ('pending','approved')
          AND start_time < ?
          AND end_time   > ?
      `, [resource_name, end_time, start_time]);

      if (conflicts.length > 0) {
        return res.status(409).json({ error: 'Time slot already booked' });
      }

      const result = await dbRun(
        `INSERT INTO bookings (user_id, resource_type, resource_name, start_time, end_time, status, reason)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [targetUserId, resource_type, resource_name, start_time, end_time, reason ?? null]
      );

      if (!result || typeof result.lastID !== 'number') {
        console.error('POST /api/bookings - insert returned unexpected result', result);
        return res.status(500).json({ error: 'Failed to create booking' });
      }

      const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [result.lastID]);
      if (!booking) {
        console.error('POST /api/bookings - could not retrieve booking after insert, id=', result.lastID);
        return res.status(500).json({ error: 'Failed to retrieve created booking' });
      }

      res.status(201).json(booking);
    } catch (error: any) {
      console.error('POST /api/bookings - error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);


// PUT /api/bookings/:id (update)
router.put('/:id',
  authenticate,
  [
    body('resource_type').optional().trim().notEmpty(),
    body('resource_name').optional().trim().notEmpty(),
    body('start_time').optional().isISO8601(),
    body('end_time').optional().isISO8601(),
    body('reason').optional().isString().isLength({ max: 500 })
  ],
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const booking: any = await dbGet('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      const isPrivileged = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.STAFF;
      const isOwner = booking.user_id === req.user!.userId;
      if (!isPrivileged && !isOwner) return res.status(403).json({ error: 'Access denied' });

      if (booking.status === 'approved' && !isPrivileged) {
        return res.status(400).json({ error: 'Approved bookings cannot be edited by requester' });
      }

      const updates: any = {};
      if (req.body.resource_type) updates.resource_type = req.body.resource_type;
      if (req.body.resource_name) updates.resource_name = req.body.resource_name;
      if (req.body.start_time) updates.start_time = req.body.start_time;
      if (req.body.end_time) updates.end_time = req.body.end_time;
      if (req.body.reason !== undefined) updates.reason = req.body.reason;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      const nextStart = updates.start_time ?? booking.start_time;
      const nextEnd   = updates.end_time   ?? booking.end_time;
      const nextName  = updates.resource_name ?? booking.resource_name;

      if (!isStartBeforeEnd(nextStart, nextEnd)) {
        return res.status(400).json({ error: 'start_time must be before end_time' });
      }

      const editConflicts = await dbAll(`
        SELECT id FROM bookings
        WHERE resource_name = ?
          AND status IN ('pending','approved')
          AND start_time < ?
          AND end_time   > ?
          AND id <> ?
      `, [nextName, nextEnd, nextStart, req.params.id]);

      if (editConflicts.length > 0) {
        return res.status(409).json({ error: 'Time slot already booked' });
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

// PATCH /api/bookings/:id/status (admin/staff only)
router.patch('/:id/status',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.STAFF),
  [body('status').isIn(['pending','approved','rejected','completed'])],
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { status } = req.body as { status: string };
      const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      if (status === 'approved') {
        const conflicts = await dbAll(`
          SELECT id FROM bookings
          WHERE resource_name = ?
            AND status IN ('pending','approved')
            AND start_time < ?
            AND end_time   > ?
            AND id <> ?
        `, [booking.resource_name, booking.end_time, booking.start_time, booking.id]);
        if (conflicts.length > 0) {
          return res.status(409).json({ error: 'conflict-now', message: 'Overlaps an existing booking' });
        }
      }

      await dbRun('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
      const updated = await dbGet('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /api/bookings/:id
router.delete('/:id', authenticate, async (req: Request & { user?: any }, res: Response) => {
  try {
    const booking: any = await dbGet('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isPrivileged = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.STAFF;
    const isOwner = booking.user_id === req.user!.userId;
    if (!isPrivileged && !isOwner) return res.status(403).json({ error: 'Access denied' });

    if (booking.status === 'approved' && !isPrivileged) {
      return res.status(400).json({ error: 'Approved bookings cannot be deleted by requester' });
    }

    await dbRun('DELETE FROM bookings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Booking deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
