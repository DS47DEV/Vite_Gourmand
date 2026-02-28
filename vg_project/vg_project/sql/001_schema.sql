CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  prenom        TEXT NOT NULL,
  nom           TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'client',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menus (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('classique','vegan','vegetarien')),
  theme       TEXT,
  desc_short  TEXT NOT NULL,
  desc_full   TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price > 0),
  min_persons INT NOT NULL CHECK (min_persons > 0),
  img_url     TEXT,
  allergens   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id          BIGSERIAL PRIMARY KEY,
  ref         TEXT UNIQUE NOT NULL,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  menu_id     BIGINT NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
  persons     INT NOT NULL CHECK (persons > 0),
  event_date  DATE NOT NULL,
  venue       TEXT,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'received',
  total       NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id         BIGSERIAL PRIMARY KEY,
  order_id   BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  stars      INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
