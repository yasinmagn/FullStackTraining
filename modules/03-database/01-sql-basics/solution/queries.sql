-- Complete each TODO. Test each one in psql before moving on.

-- TODO 3: the 5 cheapest products (name, price)
SELECT name, price
FROM products
ORDER BY price ASC
LIMIT 5;

-- TODO 4: all out-of-stock products
SELECT name, stock, category_id
FROM products
WHERE stock = 0;

-- TODO 5: products between $10 and $100, sorted by price ascending
SELECT name, price
FROM products
WHERE price BETWEEN 10 AND 100
ORDER BY price ASC;

-- TODO 6: count of products per category_id (GROUP BY)
SELECT category_id, count(*) AS product_count
FROM products
GROUP BY category_id
ORDER BY category_id;

-- TODO 7: case-insensitive search for products with 'phone' in the name (ILIKE)
SELECT name, price
FROM products
WHERE name ILIKE '%phone%';

-- TODO 8 (break things on purpose — each statement FAILS; the error is pasted below it):

-- a) insert a product with price -5
INSERT INTO products (name, price, stock, category_id) VALUES ('Broken Price', -5, 1, 1);
-- ERROR:  new row for relation "products" violates check constraint "products_price_check"
-- DETAIL:  Failing row contains (..., Broken Price, -5.00, 1, 1, ...).

-- b) insert a product with category_id 999 (no such category)
INSERT INTO products (name, price, stock, category_id) VALUES ('Orphan Product', 10, 1, 999);
-- ERROR:  insert or update on table "products" violates foreign key constraint "products_category_id_fkey"
-- DETAIL:  Key (category_id)=(999) is not present in table "categories".

-- c) insert two users with the same email (after TODO 1)
INSERT INTO users (name, email, password_hash) VALUES ('Alice', 'dupe@sooqonline.local', 'hash1');
INSERT INTO users (name, email, password_hash) VALUES ('Alice Clone', 'dupe@sooqonline.local', 'hash2');
-- ERROR:  duplicate key value violates unique constraint "users_email_key"
-- DETAIL:  Key (email)=(dupe@sooqonline.local) already exists.
