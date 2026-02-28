import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menus.js';
import orderRoutes from './routes/orders.js';
import reviewRoutes from './routes/reviews.js';
import eventRoutes from './routes/events.js';

const app = express();

// --- Security headers ---
app.use(helmet({
  contentSecurityPolicy: false, // set CSP at reverse-proxy for static front; keep API permissive
}));

// --- JSON body limits to reduce abuse ---
app.use(express.json({ limit: '200kb' }));

// --- CORS ---
const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// --- Rate limit (basic anti-bruteforce) ---
app.use(rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/events', eventRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// Error handler (don’t leak details in prod)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
  return res.status(500).json({ error: 'SERVER_ERROR', detail: String(err?.message || err) });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`API listening on :${port} (CORS origin: ${origin})`);
});
