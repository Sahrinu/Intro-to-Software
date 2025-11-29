import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { dbGet, dbAll, dbRun } from '../utils/db.utils';
import { UserRole } from '../types';

const router = express.Router();
const detailedRequest = (id: string | number) => dbGet(`
  SELECT mr.*, 
         u.name as requester_name, u.email as requester_email,
         a.name as assigned_name
  FROM maintenance_requests mr
  JOIN users u ON mr.user_id = u.id
  LEFT JOIN users a ON mr.assigned_to = a.id
  WHERE mr.id = ?
`, [id]);

// Get all maintenance requests
router.get('/', authenticate, async (req: Request & { user?: any }, res: Response) => {
  try {
    let requests;
    
    // Admins can see all requests
    if (req.user!.role === UserRole.ADMIN) {
      requests = await dbAll(`
        SELECT mr.*, 
               u.name as requester_name, u.email as requester_email,
               a.name as assigned_name
        FROM maintenance_requests mr
        JOIN users u ON mr.user_id = u.id
        LEFT JOIN users a ON mr.assigned_to = a.id
        ORDER BY 
          CASE mr.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          mr.created_at DESC
      `);
    } else if (req.user!.role === UserRole.MAINTENANCE) {
      // maintenance@campus.edu can see all requests
      // Other maintenance staff can only see requests assigned to them
      if (req.user!.email === 'maintenance@campus.edu') {
        requests = await dbAll(`
          SELECT mr.*, 
                 u.name as requester_name, u.email as requester_email,
                 a.name as assigned_name
          FROM maintenance_requests mr
          JOIN users u ON mr.user_id = u.id
          LEFT JOIN users a ON mr.assigned_to = a.id
          ORDER BY 
            CASE mr.priority
              WHEN 'urgent' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'low' THEN 4
            END,
            mr.created_at DESC
        `);
      } else {
        // Other maintenance staff only see their assigned requests
        requests = await dbAll(`
          SELECT mr.*, 
                 u.name as requester_name, u.email as requester_email,
                 a.name as assigned_name
          FROM maintenance_requests mr
          JOIN users u ON mr.user_id = u.id
          LEFT JOIN users a ON mr.assigned_to = a.id
          WHERE mr.assigned_to = ?
          ORDER BY 
            CASE mr.priority
              WHEN 'urgent' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'low' THEN 4
            END,
            mr.created_at DESC
        `, [req.user!.userId]);
      }
    } else {
      // Regular users can only see their own requests
      requests = await dbAll(`
        SELECT mr.*, 
               u.name as requester_name, u.email as requester_email,
               a.name as assigned_name
        FROM maintenance_requests mr
        JOIN users u ON mr.user_id = u.id
        LEFT JOIN users a ON mr.assigned_to = a.id
        WHERE mr.user_id = ?
        ORDER BY mr.created_at DESC
      `, [req.user!.userId]);
    }

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get maintenance request by ID
router.get('/:id', authenticate, async (req: Request & { user?: any }, res: Response) => {
  try {
    const request: any = await detailedRequest(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    // Check access permissions
    const isAdmin = req.user!.role === UserRole.ADMIN;
    const isMaintenanceLead = req.user!.role === UserRole.MAINTENANCE && req.user!.email === 'maintenance@campus.edu';
    const isAssignedStaff = req.user!.role === UserRole.MAINTENANCE && request.assigned_to === req.user!.userId;
    const isRequester = request.user_id === req.user!.userId;

    if (!isAdmin && !isMaintenanceLead && !isAssignedStaff && !isRequester) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(request);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create maintenance request
router.post('/',
  authenticate,
  [
    body('title').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('location').trim().notEmpty(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
  ],
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, location, priority = 'medium' } = req.body;

      const result = await dbRun(
        `INSERT INTO maintenance_requests (user_id, title, description, location, priority, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [req.user!.userId, title, description, location, priority]
      );

      const request = await dbGet('SELECT * FROM maintenance_requests WHERE id = ?', [result.lastID]);
      res.status(201).json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update maintenance request status (admin and maintenance staff only)
router.patch('/:id/status',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MAINTENANCE),
  [
    body('status').isIn(['pending', 'in_progress', 'completed', 'cancelled'])
  ],
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status } = req.body;
      const existing = await dbGet('SELECT id FROM maintenance_requests WHERE id = ?', [req.params.id]);
      
      if (!existing) {
        return res.status(404).json({ error: 'Maintenance request not found' });
      }

      await dbRun(
        'UPDATE maintenance_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, req.params.id]
      );

      const request = await detailedRequest(req.params.id);
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Assign maintenance request (admin and maintenance@campus.edu only)
router.patch('/:id/assign',
  authenticate,
  [
    body('assigned_to').isInt()
  ],
  async (req: Request & { user?: any }, res: Response) => {
    try {
      // Check if user is admin or maintenance@campus.edu
      if (req.user!.role !== UserRole.ADMIN && req.user!.email !== 'maintenance@campus.edu') {
        return res.status(403).json({ error: 'Only admins and maintenance@campus.edu can assign staff' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { assigned_to } = req.body;
      const requestExists = await dbGet('SELECT id FROM maintenance_requests WHERE id = ?', [req.params.id]);
      if (!requestExists) {
        return res.status(404).json({ error: 'Maintenance request not found' });
      }

      const assignee = await dbGet('SELECT id, role FROM users WHERE id = ?', [assigned_to]);
      if (!assignee || assignee.role !== UserRole.MAINTENANCE) {
        return res.status(400).json({ error: 'Assignee must be maintenance staff' });
      }

      await dbRun(
        'UPDATE maintenance_requests SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [assigned_to, req.params.id]
      );

      const request = await detailedRequest(req.params.id);
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update maintenance request (requester or admin/maintenance)
router.put('/:id',
  authenticate,
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('location').optional().trim().notEmpty(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
  ],
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const request: any = await dbGet('SELECT * FROM maintenance_requests WHERE id = ?', [req.params.id]);

      if (!request) {
        return res.status(404).json({ error: 'Maintenance request not found' });
      }

      // Check permissions
      if (req.user!.role !== UserRole.ADMIN && 
          req.user!.role !== UserRole.MAINTENANCE && 
          request.user_id !== req.user!.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updates: any = {};
      if (req.body.title) updates.title = req.body.title;
      if (req.body.description) updates.description = req.body.description;
      if (req.body.location) updates.location = req.body.location;
      if (req.body.priority) updates.priority = req.body.priority;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updates), req.params.id];

      await dbRun(`UPDATE maintenance_requests SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);

      const updatedRequest = await detailedRequest(req.params.id);
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;

