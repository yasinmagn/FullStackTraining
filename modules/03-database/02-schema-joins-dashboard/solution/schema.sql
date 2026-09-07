-- Connect to the existing sooqonline database from the previous lab.
\c sooqonline

-- IF NOT EXISTS = create the table only if it isn't there yet (safe to re-run).
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- An order belongs to one user (user_id links to users.id).
-- The CHECK limits status to a fixed set of allowed values — a typo like 'shiped' is rejected.
-- TODO 1 (done): orders. status is constrained to a known set of values.
CREATE TABLE IF NOT EXISTS orders (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
  total      NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- order_items is the "line items" of an order: which product, how many, at what price.
-- ON DELETE CASCADE: if an order is deleted, its items are automatically deleted too
-- (so you never leave orphaned line items pointing to a gone order).
-- TODO 2 (done): order_items. ON DELETE CASCADE removes items when the order is deleted.
CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  -- unit_price is a SNAPSHOT of the product's price at purchase time, so later
  -- price changes don't rewrite past orders.
  unit_price NUMERIC(10,2) NOT NULL
);

-- TODO 3 (done): seed 3 users, 5 orders, and 2-4 items per order.
-- Foreign keys written by hand so the relationships are explicit.

INSERT INTO users (name, email, password_hash) VALUES
('Layla Hassan',  'layla@sooqonline.local',  'hash_layla'),
('Omar Farouk',   'omar@sooqonline.local',   'hash_omar'),
('Sara Nabil',    'sara@sooqonline.local',   'hash_sara');
-- => user ids 1 (Layla), 2 (Omar), 3 (Sara)

-- Product ids referenced below (from Lab 9 seed):
--   1 Smartphone X200 (120), 2 Smartphone Y10 (85), 3 Laptop Pro 14 (450),
--   5 USB-C Charger (8), 6 Phone Case (5), 7 Headphones Air (25),
--   8 Bluetooth Speaker (35), 11 Foldable Phone F1 (320)

-- Orders (unit_price is a snapshot of the price at purchase time).
INSERT INTO orders (id, user_id, status, total) VALUES
(1, 1, 'delivered', 245.00),   -- Layla
(2, 2, 'paid',      455.00),   -- Omar
(3, 3, 'shipped',   135.00),   -- Sara
(4, 1, 'cancelled', 355.00),   -- Layla (cancelled -> excluded from revenue)
(5, 2, 'pending',   130.00);   -- Omar
-- We inserted explicit ids above, but SERIAL keeps its own counter. setval bumps
-- that counter past the max id so the NEXT auto-generated id won't collide.
-- keep the SERIAL sequence in sync after explicit ids:
SELECT setval('orders_id_seq', (SELECT max(id) FROM orders));

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
-- Order 1 (Layla, delivered): 3 items -> 120 + 100 + 25 = 245
(1, 1, 1, 120.00),
(1, 6, 20,  5.00),
(1, 7, 1,  25.00),
-- Order 2 (Omar, paid): 2 items -> 450 + 5 = 455
(2, 3, 1, 450.00),
(2, 5, 1,   5.00),
-- Order 3 (Sara, shipped): 3 items -> 85 + 16 + 35 = 136 (approx)
(3, 2, 1,  85.00),
(3, 5, 2,   8.00),
(3, 8, 1,  35.00),
-- Order 4 (Layla, cancelled): 4 items -> counted for units sold, excluded from revenue
(4, 1, 1, 120.00),
(4, 2, 1,  85.00),
(4, 6, 10,  5.00),
(4, 5, 12,  8.00),
-- Order 5 (Omar, pending): 2 items -> 120 + 10 = 130
(5, 1, 1, 120.00),
(5, 5, 2,   8.00);
