# SooqOnline Web — Final Project Frontend

Next.js (App Router) + Tailwind CSS. The customer-facing storefront and admin panel
for SooqOnline. Talks to the [final-project backend](../backend) API.

## Pages

| Route | Rendering | Purpose |
|-------|-----------|---------|
| `/` | server | Hero + featured products |
| `/products` | server | Catalog with search (`?search=`, `?category=`) |
| `/products/[id]` | server | Product detail + stock status |
| `/cart` | client | Cart with quantity controls |
| `/checkout` | client | Place order (auth required) |
| `/orders` | client | My orders (auth required) |
| `/login`, `/register` | client | Auth forms |
| `/admin/products` | client | Admin CRUD (server enforces `403`) |

## State

- `CartContext` — client-side cart shared across the app (the pattern from
  Module 04 · Unit 2).
- `AuthContext` — JWT stored in `localStorage`, decoded for `{ userId, role, name }`.

## Configuration

`NEXT_PUBLIC_API_URL` (see `.env.local.example`) points the app at the API. Defaults
to `http://localhost:3000`. `.env.local` is git-ignored.

## Run

See [`HOW-TO-RUN.md`](./HOW-TO-RUN.md). Runs on port **3001** (the API keeps **3000**).
