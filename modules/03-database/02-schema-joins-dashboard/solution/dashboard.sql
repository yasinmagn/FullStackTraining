-- The shop-owner dashboard. Complete every TODO.

-- A JOIN combines rows from multiple tables using their linking columns (the ON condition).
-- Here we stitch orders + users + order_items + products into one readable receipt.
-- "o", "u", "oi", "p" are table aliases (short nicknames) used to keep the query short.
-- Reference example (given): order receipt for order 1
SELECT o.id AS order_id, u.name AS customer, p.name AS product,
       oi.quantity, oi.unit_price, oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN users u        ON u.id = o.user_id       -- match each order to its customer
JOIN order_items oi ON oi.order_id = o.id     -- match each order to its line items
JOIN products p     ON p.id = oi.product_id   -- match each line item to its product
WHERE o.id = 1;

-- SUM adds up a column across each group. GROUP BY product means one total row per product.
-- TODO 4 (done): top 5 best-selling products (name, total units sold)
SELECT p.name, SUM(oi.quantity) AS units_sold
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY units_sold DESC
LIMIT 5;

-- Revenue = quantity * price, summed. We JOIN to orders only to read status,
-- then <> ('not equal') filters out cancelled orders so they don't count as sales.
-- TODO 5 (done): total revenue of all non-cancelled orders
SELECT SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status <> 'cancelled';

-- Chaining several JOINs walks the relationships: item -> product -> category, plus item -> order.
-- This is how you aggregate a value (revenue) grouped by data from a distant table (category name).
-- TODO 6 (done): revenue per category (category name, revenue) — 3 joins!
SELECT c.name AS category, SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
JOIN products p    ON p.id = oi.product_id
JOIN categories c  ON c.id = p.category_id
JOIN orders o      ON o.id = oi.order_id
WHERE o.status <> 'cancelled'
GROUP BY c.id, c.name
ORDER BY revenue DESC;

-- Group by the customer, sum their line totals — a classic "per-customer" report.
-- TODO 7 (done): each customer's total spending, highest first
SELECT u.name AS customer, SUM(oi.quantity * oi.unit_price) AS total_spent
FROM users u
JOIN orders o      ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY u.id, u.name
ORDER BY total_spent DESC;

-- HAVING filters AFTER grouping (WHERE filters rows BEFORE grouping). Use HAVING when
-- the condition depends on an aggregate like COUNT — here, keep only orders with >2 lines.
-- TODO 8 (done): orders containing more than 2 items (GROUP BY + HAVING)
-- "more than 2 items" = more than 2 line-item rows per order.
SELECT o.id AS order_id, COUNT(oi.id) AS item_lines
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id
HAVING COUNT(oi.id) > 2
ORDER BY item_lines DESC;
