import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { dbGet, dbAll, dbRun } from '../utils/db.utils';
import { UserRole } from '../types';

const router = express.Router();

// Get all events
router.get('/', authenticate, async (req: Request & { user?: any }, res: Response) => {
  try {
    // Delete ended events (where end_time is in the past)
    await dbRun('DELETE FROM events WHERE datetime(end_time) < datetime("now")');

    let query = `
      SELECT e.*, u.name as organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
    `;
    const params: any[] = [];
    let whereConditions: string[] = [];
    
    // Filter out rejected events for all users
    whereConditions.push('e.status != ?');
    params.push('rejected');
    
    // Regular users see all approved events + their own pending requests
    // Admins see all non-rejected events
    if (req.user!.role !== UserRole.ADMIN) {
      whereConditions.push('(e.status = ? OR e.organizer_id = ?)');
      params.push('approved', req.user!.userId);
    }

    // Location filter
    if (req.query.location && req.query.location !== '') {
      whereConditions.push('e.location = ?');
      params.push(req.query.location);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    const events = await dbAll(query + ' ORDER BY e.start_time ASC', params);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get event by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const event: any = await dbGet(`
      SELECT e.*, u.name as organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.id = ?
    `, [req.params.id]);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create event (authenticated users)
router.post('/',
  authenticate,
  [
    body('title').trim().notEmpty(),
    body('start_time').isISO8601(),
    body('end_time').isISO8601(),
    body('description').optional(),
    body('location').optional(),
    body('category').optional()
  ],
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, location, start_time, end_time, category } = req.body;

      // Check for duplicate event (same location with overlapping time, only approved events)
      const duplicate = await dbGet(
        `SELECT * FROM events WHERE status = 'approved' AND LOWER(COALESCE(location, '')) = LOWER(COALESCE(?, '')) AND location IS NOT NULL AND ? IS NOT NULL AND (
          (datetime(start_time) <= datetime(?) AND datetime(end_time) >= datetime(?)) OR
          (datetime(start_time) <= datetime(?) AND datetime(end_time) >= datetime(?)) OR
          (datetime(start_time) >= datetime(?) AND datetime(end_time) <= datetime(?))
        )`,
        [location, location, end_time, end_time, start_time, start_time, start_time, end_time]
      );
      if (duplicate) {
        return res.status(400).json({ error: 'This location is already booked at this time. Please choose a different location or time slot.' });
      }

      // Admins' events are auto-approved, regular users' events are pending
      const status = req.user!.role === UserRole.ADMIN ? 'approved' : 'pending';

      const result = await dbRun(
        `INSERT INTO events (title, description, location, start_time, end_time, organizer_id, category, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description || null, location || null, start_time, end_time, req.user!.userId, category || null, status]
      );

      const event = await dbGet('SELECT * FROM events WHERE id = ?', [result.lastID]);
      res.status(201).json(event);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update event (organizer or admin only)
router.put('/:id',
  authenticate,
  [
    body('title').optional().trim().notEmpty(),
    body('start_time').optional().isISO8601(),
    body('end_time').optional().isISO8601()
  ],
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const event: any = await dbGet('SELECT * FROM events WHERE id = ?', [req.params.id]);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check permissions
      if (req.user!.role !== UserRole.ADMIN && event.organizer_id !== req.user!.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updates: any = {};
      if (req.body.title) updates.title = req.body.title;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.location !== undefined) updates.location = req.body.location;
      if (req.body.start_time) updates.start_time = req.body.start_time;
      if (req.body.end_time) updates.end_time = req.body.end_time;
      if (req.body.category !== undefined) updates.category = req.body.category;

      // If location or timing changes and event was approved, reset to pending (unless user is admin)
      const locationChanged = req.body.location !== undefined && req.body.location !== event.location;
      const timingChanged = (req.body.start_time && req.body.start_time !== event.start_time) || 
                           (req.body.end_time && req.body.end_time !== event.end_time);
      
      if ((locationChanged || timingChanged) && event.status === 'approved' && req.user!.role !== UserRole.ADMIN) {
        updates.status = 'pending';
      }

      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updates), req.params.id];

      await dbRun(`UPDATE events SET ${setClause} WHERE id = ?`, values);

      const updatedEvent = await dbGet('SELECT * FROM events WHERE id = ?', [req.params.id]);
      res.json(updatedEvent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete event (organizer or admin only)
router.delete('/:id', authenticate, async (req: Request & { user?: any }, res: Response) => {
  try {
    const event: any = await dbGet('SELECT * FROM events WHERE id = ?', [req.params.id]);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    if (req.user!.role !== UserRole.ADMIN && event.organizer_id !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dbRun('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve event (admin only)
router.patch('/:id/approve', authenticate, authorize(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const event: any = await dbGet('SELECT * FROM events WHERE id = ?', [req.params.id]);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status === 'approved') {
      return res.status(400).json({ error: 'Event is already approved' });
    }

    // Check for conflicts with approved events
    const conflict = await dbGet(
      `SELECT * FROM events WHERE id != ? AND status = 'approved' AND LOWER(COALESCE(location, '')) = LOWER(COALESCE(?, '')) AND location IS NOT NULL AND ? IS NOT NULL AND (
        (datetime(start_time) <= datetime(?) AND datetime(end_time) >= datetime(?)) OR
        (datetime(start_time) <= datetime(?) AND datetime(end_time) >= datetime(?)) OR
        (datetime(start_time) >= datetime(?) AND datetime(end_time) <= datetime(?))
      )`,
      [req.params.id, event.location, event.location, event.end_time, event.end_time, event.start_time, event.start_time, event.start_time, event.end_time]
    );

    if (conflict) {
      return res.status(400).json({ error: 'Cannot approve: This location is already booked at this time by another approved event.' });
    }

    await dbRun('UPDATE events SET status = ? WHERE id = ?', ['approved', req.params.id]);
    const updatedEvent = await dbGet('SELECT * FROM events WHERE id = ?', [req.params.id]);
    res.json(updatedEvent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject event (admin only)
router.patch('/:id/reject', authenticate, authorize(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const event: any = await dbGet('SELECT * FROM events WHERE id = ?', [req.params.id]);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await dbRun('UPDATE events SET status = ? WHERE id = ?', ['rejected', req.params.id]);
    const updatedEvent = await dbGet('SELECT * FROM events WHERE id = ?', [req.params.id]);
    res.json(updatedEvent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;


