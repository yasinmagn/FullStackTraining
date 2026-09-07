# Unit 3 — JavaScript Fundamentals

## Introduction

Now the shop gets a brain. Before touching the page, you write the pure logic that
operates on the product data: finding, filtering, searching, and totalling. Pure
functions (same input → same output, no side effects) are easy to test in the
browser console — which is exactly how you'll verify them.

## Learning objectives

- Work with arrays of objects (the product catalog).
- Use `find`, `filter`, `map`, and `reduce` instead of manual loops.
- Write pure functions and handle edge cases (not-found → `null`, empty cart → `0`).
- Test logic directly in the DevTools console.

## Session brief

Starter = Unit 2 solution (styles complete). Complete every TODO in `starter/shop.js`.

## Tasks

1. Add 6 more products of your own (at least 3 categories total).
2. `findById(products, id)` — return the matching product or `null`.
3. `productsInCategory(products, category)` — return a new filtered array.
4. `cheapestProduct(products)` — return the single cheapest product.
5. `searchByName(products, text)` — case-insensitive name search.
6. `cartTotal(cartItems)` — total of `{ price, quantity }` items (`0` for empty).

## Verify

Open `index.html`, open DevTools → Console, and run the self-tests at the bottom of
`shop.js`. Edge cases return `null` / `0` as expected.

## Solution walkthrough

See [`solution/shop.js`](./solution/shop.js). Notice how each function is a
one-liner built from an array method: `find` for a single match, `filter` for a
subset, `reduce` for aggregation. The `?? null` on `findById` turns `undefined`
(no match) into an explicit `null`, and `reduce` with a `0` seed makes the empty
cart naturally total `0`.
