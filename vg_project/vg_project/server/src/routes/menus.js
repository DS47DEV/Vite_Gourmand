import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { menuCreateSchema, menuUpdateSchema } from '../utils/schemas.js';

const r = Router();

r.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM menus ORDER BY created_at DESC');
  res.json(rows);
});

r.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'BAD_ID' });
  const { rows } = await pool.query('SELECT * FROM menus WHERE id=$1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(rows[0]);
});

r.post('/', requireAuth, requireRole('employee', 'admin'), validateBody(menuCreateSchema), async (req, res) => {
  const m = req.body;
  const q = `
    INSERT INTO menus(name,type,theme,desc_short,desc_full,price,min_persons,img_url,allergens)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *`;
  const vals = [m.name, m.type, m.theme ?? null, m.desc_short, m.desc_full ?? null, m.price, m.min_persons, m.img_url ?? null, m.allergens ?? null];
  const { rows } = await pool.query(q, vals);
  res.status(201).json(rows[0]);
});

r.put('/:id', requireAuth, requireRole('employee', 'admin'), validateBody(menuCreateSchema), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'BAD_ID' });
  const m = req.body;
  const q = `
    UPDATE menus SET name=$1,type=$2,theme=$3,desc_short=$4,desc_full=$5,price=$6,min_persons=$7,img_url=$8,allergens=$9
    WHERE id=$10
    RETURNING *`;
  const vals = [m.name, m.type, m.theme ?? null, m.desc_short, m.desc_full ?? null, m.price, m.min_persons, m.img_url ?? null, m.allergens ?? null, id];
  const { rows } = await pool.query(q, vals);
  if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(rows[0]);
});

r.patch('/:id', requireAuth, requireRole('employee', 'admin'), validateBody(menuUpdateSchema), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'BAD_ID' });

  const fields = req.body;
  const keys = Object.keys(fields);
  if (keys.length === 0) return res.status(400).json({ error: 'NO_FIELDS' });

  // Build safe dynamic update
  const set = keys.map((k, i) => `${k}=$${i + 1}`).join(',');
  const vals = keys.map((k) => fields[k] ?? null);
  vals.push(id);

  const { rows } = await pool.query(`UPDATE menus SET ${set} WHERE id=$${vals.length} RETURNING *`, vals);
  if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(rows[0]);
});

r.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'BAD_ID' });
  const { rowCount } = await pool.query('DELETE FROM menus WHERE id=$1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'NOT_FOUND' });
  res.status(204).send();
});

export default r;
