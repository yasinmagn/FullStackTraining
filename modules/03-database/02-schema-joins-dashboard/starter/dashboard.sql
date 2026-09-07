-- The shop-owner dashboard. Complete every TODO.

-- Reference example (given): order receipt for order 1
SELECT o.id AS order_id, u.name AS customer, p.name AS product,
       oi.quantity, oi.unit_price, oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN users u        ON u.id = o.user_id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p     ON p.id = oi.product_id
WHERE o.id = 1;

-- TODO 4: top 5 best-selling products (name, total units sold)

-- TODO 5: total revenue of all non-cancelled orders

-- TODO 6: revenue per category (category name, revenue) — 3 joins!

-- TODO 7: each customer's total spending, highest first

-- TODO 8: orders containing more than 2 items (GROUP BY + HAVING)
