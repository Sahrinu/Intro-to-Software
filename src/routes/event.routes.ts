import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { dbGet, dbAll, dbRun } from '../utils/db.utils';
import { UserRole } from '../types';

const router = express.Router();

// Get all events
router.get('/', async (req: Request, res: Response) => {
  try {
    const events = await dbAll(`
      SELECT e.*, u.name as organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      ORDER BY e.start_time ASC
    `);
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

      const result = await dbRun(
        `INSERT INTO events (title, description, location, start_time, end_time, organizer_id, category)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, description || null, location || null, start_time, end_time, req.user!.userId, category || null]
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

export default router;


