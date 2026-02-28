import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { orderCreateSchema, orderUpdateSchema, orderStatusSchema } from '../utils/schemas.js';

const r = Router();

function makeRef() {
  const d = new Date();
  const stamp = d.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VG-${stamp}-${rand}`;
}

// List orders: client => own orders, employee/admin => all
r.get('/', requireAuth, async (req, res) => {
  const role = req.user.role;
  if (role === 'employee' || role === 'admin') {
    const { rows } = await pool.query(
      `SELECT o.*, u.email AS user_email, m.name AS menu_name
       FROM orders o
       JOIN users u ON u.id=o.user_id
       JOIN menus m ON m.id=o.menu_id
       ORDER BY o.created_at DESC`
    );
    return res.json(rows);
  }

  const { rows } = await pool.query(
    `SELECT o.*, m.name AS menu_name
     FROM orders o
     JOIN menus m ON m.id=o.menu_id
     WHERE o.user_id=$1
     ORDER BY o.created_at DESC`,
    [req.user.sub]
  );
  return res.json(rows);
});

r.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'BAD_ID' });

  const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [id]);
  const order = rows[0];
  if (!order) return res.status(404).json({ error: 'NOT_FOUND' });

  const role = req.user.role;
  if (role === 'client' && order.user_id !== req.user.sub) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  return res.json(order);
});

r.post('/', requireAuth, validateBody(orderCreateSchema), async (req, res) => {
  const { menu_id, persons, event_date, venue, notes } = req.body;

  // Price snapshot
  const m = await pool.query('SELECT price FROM menus WHERE id=$1', [menu_id]);
  if (!m.rows[0]) return res.status(400).json({ error: 'MENU_NOT_FOUND' });

  const total = Number(m.rows[0].price) * persons;
  const ref = makeRef();

  const q = `
    INSERT INTO orders(ref,user_id,menu_id,persons,event_date,venue,notes,status,total)
    VALUES($1,$2,$3,$4,$5,$6,$7,'received',$8)
    RETURNING *`;

  const { rows } = await pool.query(q, [ref, req.user.sub, menu_id, persons, event_date, venue ?? null, notes ?? null, total]);
  return res.status(201).json(rows[0]);
});

// Update allowed only if received and owned (client) OR employee/admin
r.put('/:id', requireAuth, validateBody(orderUpdateSchema), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'BAD_ID' });

  const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [id]);
  const order = rows[0];
  if (!order) return res.status(404).json({ error: 'NOT_FOUND' });

  const role = req.user.role;
  if (role === 'client') {
    if (order.user_id !== req.user.sub) return res.status(403).json({ error: 'FORBIDDEN' });
    if (order.status !== 'received') return res.status(409).json({ error: 'ORDER_LOCKED' });
  }

  const patch = req.body;
  const persons = patch.persons ?? order.persons;

  // recompute total if persons changed
  let total = order.total;
  if (patch.persons) {
    const m = await pool.query('SELECT price FROM menus WHERE id=$1', [order.menu_id]);
    total = Number(m.rows[0].price) * persons;
  }

  const q = `
    UPDATE orders SET persons=$1,event_date=$2,venue=$3,notes=$4,total=$5
    WHERE id=$6
    RETURNING *`;

  const { rows: upd } = await pool.query(q, [persons, patch.event_date ?? order.event_date, patch.venue ?? order.venue, patch.notes ?? order.notes, total, id]);
  return res.json(upd[0]);
});

// Status update (employee/admin)
r.patch('/:id/status', requireAuth, requireRole('employee', 'admin'), validateBody(orderStatusSchema), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'BAD_ID' });

  const { status } = req.body;
  const { rows } = await pool.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
  if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(rows[0]);
});

// Cancel: client (own) if received/accepted, or admin anytime
r.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'BAD_ID' });

  const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [id]);
  const order = rows[0];
  if (!order) return res.status(404).json({ error: 'NOT_FOUND' });

  const role = req.user.role;
  if (role === 'client') {
    if (order.user_id !== req.user.sub) return res.status(403).json({ error: 'FORBIDDEN' });
    if (!['received', 'accepted'].includes(order.status)) return res.status(409).json({ error: 'CANNOT_CANCEL' });
  } else if (role !== 'admin' && role !== 'employee') {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  const { rows: upd } = await pool.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', ['cancelled', id]);
  res.json(upd[0]);
});

export default r;
