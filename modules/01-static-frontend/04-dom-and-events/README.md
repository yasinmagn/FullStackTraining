# Unit 4 — DOM & Events *(Milestone 1)*

## Introduction

This is the milestone that ties Module 1 together. Instead of hardcoded product
cards, the page now renders itself **from data** and reacts to the user: live search
as you type, category filters, and a working cart with a running total. This is the
mental model every framework (React included) is built on — UI as a function of data.

## Learning objectives

- Render DOM elements from a data array (`createElement` / `innerHTML`).
- Handle events with **event delegation** (one listener on a container).
- Update the UI in response to state changes (cart, search, filters).
- Keep logic pure (reuse the Unit 3 functions) and the DOM layer thin.

## Session brief

Starter = Unit 3 solution. Complete `starter/app.js`: render from data, live search,
category filters, and a working cart. Do the work on a feature branch, merge to main,
and push.

## Tasks

1. `renderProducts(list)` — clear the grid, then append a card per product with name,
   price, and an Add-to-Cart button carrying `data-id`. Disable + label "Out of stock"
   when `stock === 0`.
2. Grid click handler — when a button is clicked, find the product by `data-id`, add to
   cart (quantity +1 if already there), then `renderCart()`.
3. `renderCart()` — update `#cart-count`, rebuild `#cart-list` (one `<li>` per item with
   name, quantity, and a Remove button), set `#cart-total` via `cartTotal` (reduce!).
4. Live search — on input in `#search`, `renderProducts` filtered by name (case-insensitive,
   using `.filter` — no `for` loops).
5. Category buttons — build one button per unique category (`map` + `Set`); clicking filters
   the grid; "All" shows everything.

## Verify

- No hardcoded product cards remain — everything renders from the data.
- Search filters as you type.
- Cart count + total update on add/remove.
- Out-of-stock buttons are disabled.

## Solution walkthrough

See [`solution/app.js`](./solution/app.js). The key idea is **event delegation**: a
single click listener on the grid handles every product button, so cards added later
still work without re-binding. Category buttons are generated from
`new Set(products.map(p => p.category))`, and every render calls the pure Unit 3
functions — the DOM code never re-implements filtering or totalling.
