# Unit 3 — Next.js Shop

## Introduction

The React SPA in Unit 1 fetches everything in the browser — the product list is
invisible to search engines and the first paint is slow. In this unit you rebuild the
shop on **Next.js with the App Router**. Product pages are rendered on the *server*
(the products are in the page source!), while the cart stays interactive on the client
via a Context. You'll style with **Tailwind** and use Next's `loading` and `error`
conventions.

No authentication yet — that's the milestone in Unit 4. This unit is the browsing
experience: home, product list with search, product detail, and a working cart that
survives navigation.

## Learning objectives

- Understand **server components** (default) vs **client components** (`"use client"`).
- Fetch data on the server with `fetch(..., { cache: "no-store" })`.
- Use App Router file conventions: `page.jsx`, `layout.jsx`, `loading.jsx`, `error.jsx`,
  and dynamic `[id]` routes.
- Share client state across routes with React Context (the cart).
- Read `searchParams` on the server to drive a search query.

## Session brief

Recommended: run `npx create-next-app@latest sooqonline-next` (App Router: yes,
Tailwind: yes, TypeScript: no), then copy this unit's `app/`, `components/`, and `lib/`
files over the generated ones. Copy `.env.local.example` to `.env.local`. Complete the
TODOs. **Run** with the API on `:3000`: `npm run dev` (this app runs on `:3001` so the
API keeps `:3000`).

## Tasks

1. **Home** (`app/page.jsx`) — a hero section (shop name + tagline + link to
   `/products`) and a "Featured" strip that server-fetches `/products` and shows the
   first 4.
2. **Products list** (`app/products/page.jsx`) — add a client `<SearchBox />` above the
   grid that navigates to `/products?search=...`, and read `searchParams` on the server
   to pass `?search=` to the API.
3. **Product detail** (`app/products/[id]/page.jsx`) — fetch
   `` `${API}/products/${params.id}` `` with `cache: "no-store"`. If `!res.ok`, render
   "Product not found." Otherwise show name, price, stock status, and an
   `<AddToCartButton />`.
4. **Cart** (`app/cart/page.jsx`) — render cart items (name, unit price, quantity with
   +/− buttons, remove) and the total. Empty cart shows a friendly message + link to
   `/products`.
5. **CartContext** — `addItem(product)` with the same immutable logic as Unit 1.
6. **CartContext** — `removeItem(id)` and `setQuantity(id, quantity)` (a quantity of 0
   removes the item).

## Verify

- `/products` is server-rendered — view source and you can see product names in the HTML.
- `/products/[id]` works for a real id, and shows "Product not found." for a bad one.
- The cart survives navigation between pages (it lives in a Provider in the layout).
- `loading.jsx` shows on a slow network (throttle in DevTools).
- Searching navigates to `/products?search=...` and the server refetches.

## Solution walkthrough

See the [`solution/`](./solution) folder. The layout wraps everything in a
`CartProvider`, so the cart persists as you move between routes. The product list and
detail pages are **async server components** — they `await fetch(...)` before rendering,
so the markup ships with data. The only client components are the ones that need
interactivity or browser APIs: `AddToCartButton`, `SearchBox`, `CartContext`, and the
cart page. `setQuantity` funnels through `removeItem` when the quantity hits zero, so
there's a single place that owns "remove."
