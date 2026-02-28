import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { reviewCreateSchema, reviewModerateSchema } from '../utils/schemas.js';

const r = Router();

// Public: only approved reviews
r.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT rv.id, rv.stars, rv.comment, rv.created_at, u.prenom, u.nom
     FROM reviews rv
     JOIN users u ON u.id=rv.user_id
     WHERE rv.status='approved'
     ORDER BY rv.created_at DESC`
  );
  res.json(rows);
});

// Client: create review for own completed order
r.post('/', requireAuth, validateBody(reviewCreateSchema), async (req, res) => {
  const { order_id, stars, comment } = req.body;

  const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [order_id]);
  const order = rows[0];
  if (!order) return res.status(400).json({ error: 'ORDER_NOT_FOUND' });
  if (order.user_id !== req.user.sub) return res.status(403).json({ error: 'FORBIDDEN' });
  if (order.status !== 'completed') return res.status(409).json({ error: 'ORDER_NOT_COMPLETED' });

  try {
    const ins = await pool.query(
      `INSERT INTO reviews(order_id,user_id,stars,comment,status)
       VALUES($1,$2,$3,$4,'pending')
       RETURNING *`,
      [order_id, req.user.sub, stars, comment]
    );
    res.status(201).json(ins.rows[0]);
  } catch (e) {
    if (String(e?.message || '').includes('duplicate')) {
      return res.status(409).json({ error: 'REVIEW_ALREADY_EXISTS' });
    }
    console.error(e);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// Employee/admin: list pending
r.get('/pending', requireAuth, requireRole('employee', 'admin'), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT rv.*, u.email, u.prenom, u.nom
     FROM reviews rv
     JOIN users u ON u.id=rv.user_id
     WHERE rv.status='pending'
     ORDER BY rv.created_at ASC`
  );
  res.json(rows);
});

// Employee/admin: moderate
r.patch('/:id/moderate', requireAuth, requireRole('employee', 'admin'), validateBody(reviewModerateSchema), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'BAD_ID' });

  const { status } = req.body;
  const { rows } = await pool.query('UPDATE reviews SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
  if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(rows[0]);
});

export default r;
