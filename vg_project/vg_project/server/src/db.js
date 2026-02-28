import pg from 'pg';

// PostgreSQL pool (parameterized queries => protection against SQL injection)
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('Postgres pool error:', err);
});
