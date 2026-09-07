-- Start clean: drop the database if it already exists, then recreate it.
-- (Safe for a training lab — NEVER do DROP DATABASE on real production data.)
DROP DATABASE IF EXISTS sooqonline;
CREATE DATABASE sooqonline;
-- \c is a psql command that "connects to" (switches into) the sooqonline database.
\c sooqonline

-- A table is like a spreadsheet: columns define the shape, rows hold the data.
CREATE TABLE categories (
  -- SERIAL = auto-incrementing integer; PRIMARY KEY = unique row identifier.
  id   SERIAL PRIMARY KEY,
  -- NOT NULL = value is required. UNIQUE = no two categories share a name.
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  -- NUMERIC(10,2) stores money exactly (up to 10 digits, 2 after the decimal).
  -- CHECK is a rule the database enforces on every insert/update: price must be positive.
  price       NUMERIC(10,2) NOT NULL CHECK (price > 0),
  -- DEFAULT 0 means new rows start at 0 if no stock is given; can't go negative.
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  -- FOREIGN KEY: category_id must point to a real categories.id (links the two tables).
  category_id INTEGER REFERENCES categories(id),
  -- Automatically records when the row was created.
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- TODO 1 (done): users table with a UNIQUE email so no two accounts share an address.
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- INSERT adds rows. Here we add four categories in one statement.
INSERT INTO categories (name) VALUES ('phones'), ('computers'), ('accessories'), ('audio');

-- Add products. The last number in each row is the category_id it belongs to.
INSERT INTO products (name, price, stock, category_id) VALUES
('Smartphone X200', 120, 5, 1), ('Smartphone Y10', 85, 8, 1),
('Laptop Pro 14', 450, 2, 2), ('Laptop Air 13', 380, 4, 2),
('USB-C Charger', 8, 40, 3), ('Phone Case', 5, 30, 3),
('Headphones Air', 25, 0, 4), ('Bluetooth Speaker', 35, 12, 4);

-- TODO 2 (done): 12 more products => 20 total, spread across all four categories.
INSERT INTO products (name, price, stock, category_id) VALUES
('Smartphone Z Ultra', 240, 3, 1),
('Smartphone Mini 5', 60, 15, 1),
('Foldable Phone F1', 320, 1, 1),
('Gaming Laptop 17', 620, 2, 2),
('Ultrabook Slim 14', 410, 6, 2),
('Desktop Tower i7', 540, 0, 2),
('Wireless Mouse', 12, 50, 3),
('Mechanical Keyboard', 45, 20, 3),
('Laptop Sleeve 15"', 18, 25, 3),
('Noise-Cancelling Headphones', 95, 7, 4),
('Earbuds Pro', 55, 18, 4),
('Soundbar 2.1', 130, 4, 4);
