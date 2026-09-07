DROP DATABASE IF EXISTS sooqonline;
CREATE DATABASE sooqonline;
\c sooqonline

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL CHECK (price > 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id INTEGER REFERENCES categories(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- TODO 1: create table users:
--   id serial pk, name text not null, email text not null UNIQUE,
--   password_hash text not null, role text not null default 'customer',
--   created_at timestamptz default now()

INSERT INTO categories (name) VALUES ('phones'), ('computers'), ('accessories'), ('audio');

INSERT INTO products (name, price, stock, category_id) VALUES
('Smartphone X200', 120, 5, 1), ('Smartphone Y10', 85, 8, 1),
('Laptop Pro 14', 450, 2, 2), ('Laptop Air 13', 380, 4, 2),
('USB-C Charger', 8, 40, 3), ('Phone Case', 5, 30, 3),
('Headphones Air', 25, 0, 4), ('Bluetooth Speaker', 35, 12, 4);
-- TODO 2: insert 12 more products of your own (total 20)
