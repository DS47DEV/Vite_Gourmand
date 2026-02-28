import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../utils/schemas.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

r.post('/register', validateBody(registerSchema), async (req, res) => {
  const { email, password, prenom, nom } = req.body;
  const password_hash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users(email,password_hash,prenom,nom,role)
       VALUES($1,$2,$3,$4,'client')
       RETURNING id,email,prenom,nom,role,created_at`,
      [email, password_hash, prenom, nom]
    );
    const user = rows[0];
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (e) {
    if (String(e?.message || '').includes('duplicate key')) {
      return res.status(409).json({ error: 'EMAIL_ALREADY_USED' });
    }
    console.error(e);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

r.post('/login', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query(
    'SELECT id,email,password_hash,prenom,nom,role,created_at FROM users WHERE email=$1',
    [email]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

  const token = signToken(user);
  const safeUser = {
    id: user.id,
    email: user.email,
    prenom: user.prenom,
    nom: user.nom,
    role: user.role,
    created_at: user.created_at,
  };
  return res.json({ user: safeUser, token });
});

r.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id,email,prenom,nom,role,created_at FROM users WHERE id=$1',
    [req.user.sub]
  );
  return res.json(rows[0] || null);
});

export default r;
