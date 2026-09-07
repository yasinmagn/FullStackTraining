# Unit 1 — React Shop

## Introduction

You've built the SooqOnline storefront twice already — as static HTML and as
DOM-driven JavaScript. Now you rebuild it with **React**. Instead of hand-writing
`createElement` and re-rendering by hand, you describe the UI as a function of state
and let React keep the DOM in sync. The shop fetches live products from *your* API,
searches with a debounced-feeling refetch, and keeps a working cart — all with hooks.

## Learning objectives

- Manage component state with `useState`.
- Fetch data from an API inside `useEffect`, keyed on a dependency (`search`).
- Handle loading and error states in the UI.
- Update state **immutably** (never mutate arrays/objects in place).
- Pass data and callbacks down as props to a child component.

## Session brief

New app (`sooqonline-web`), scaffolded with Vite + React. **Setup:** `npm install`.
**Run:** `npm run dev` (the API from the backend module must be running on `:3000`).
Complete the TODOs in `src/App.jsx` and `src/components/ProductCard.jsx`. Your Phase 1
CSS is started for you in `src/index.css`.

## Tasks

1. `ProductCard` — receive `{ product, onAdd }` as props. Render an
   `<article class="product-card">` with the product name, price, and a button that
   calls `onAdd(product)`. When `stock === 0`, disable the button and label it
   "Out of stock".
2. `useEffect` (dependency `[search]`) — fetch `` `${API}/products?search=${search}` ``,
   then `setProducts` and `setLoading(false)`. On a fetch failure,
   `setError("API not reachable — is your server running?")`.
3. `addToCart(product)` — **replace** state, never mutate: if the product is already in
   the cart, `map` it to `quantity + 1`; otherwise spread in `{ ...product, quantity: 1 }`.
4. `removeFromCart(id)` — remove the item with `.filter`.
5. `total` — sum `price × quantity` across the cart with `.reduce`.
6. Render the cart list: one row per item showing name, quantity, and a Remove button.

*Stretch:* category filter buttons that refetch with `?category=...`.

## Verify

- Products load from **your** API (not hardcoded).
- Typing in the search box refetches with `?search=`.
- Add / remove / quantity all work, and the header total updates.
- Loading and error states show at the right times.
- Out-of-stock products have a disabled button.

## Solution walkthrough

See [`solution/src/App.jsx`](./solution/src/App.jsx) and
[`solution/src/components/ProductCard.jsx`](./solution/src/components/ProductCard.jsx).
The key idea is **UI as a function of state**: you never touch the DOM directly. The
`useEffect` refetches whenever `search` changes, and every cart update returns a *new*
array (via `map`/`filter`/spread) so React can detect the change and re-render. The
`total` is derived with `reduce` on each render — there's no separate "total" state to
keep in sync.
