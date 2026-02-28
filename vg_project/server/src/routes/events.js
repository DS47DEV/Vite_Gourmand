import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { eventCreateSchema } from '../utils/schemas.js';
import { getMongoDb } from '../mongo.js';

const r = Router();

// Ingest event (auth optional: allow anonymous by not requiring auth)
r.post('/', validateBody(eventCreateSchema), async (req, res) => {
  const db = await getMongoDb();
  const doc = {
    ...req.body,
    createdAt: new Date(),
  };
  await db.collection('events').insertOne(doc);
  res.status(201).json({ ok: true });
});

// Admin stats
r.get('/stats', requireAuth, requireRole('admin'), async (req, res) => {
  const db = await getMongoDb();

  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 7 * 864e5);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();

  const pipeline = [
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ];

  const rows = await db.collection('events').aggregate(pipeline).toArray();
  res.json({ from, to, byType: rows });
});

export default r;
