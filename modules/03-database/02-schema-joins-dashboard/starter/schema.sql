\c sooqonline

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- TODO 1: create table orders:
--   id serial pk; user_id int not null references users(id);
--   status text not null default 'pending'
--     CHECK (status IN ('pending','paid','shipped','delivered','cancelled'));
--   total numeric(10,2) not null default 0; created_at timestamptz default now()

-- TODO 2: create table order_items:
--   id serial pk; order_id int not null references orders(id) ON DELETE CASCADE;
--   product_id int not null references products(id);
--   quantity int not null CHECK (quantity > 0);
--   unit_price numeric(10,2) not null

-- TODO 3: seed 3 users, then 5 orders with 2-4 order_items each (hand-written INSERTs —
-- yes really: writing the foreign keys by hand is how the relationships click).
