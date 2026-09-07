# Unit 4 — Fullstack Auth & Checkout *(Milestone 4)*

## Introduction

This is the milestone that turns the shop into a real store. Visitors can **register**
and **log in**; the navbar greets them by name. Logged-in customers **check out** — a
real order is created, stock is decremented in the database, and the order appears in
**My Orders**. Admins get a **products management page** that customers can't reach.
Crucially, you'll learn that the *server* is the real guard: hiding a page in the UI is
politeness, but the API returns `403` no matter what the browser does.

## Learning objectives

- Implement JWT authentication on the client: store the token, decode the payload,
  greet the user, and log out.
- Protect routes on the client and understand why the **server** is the real
  authorization boundary.
- Send authenticated requests with an `Authorization: Bearer` header.
- Build a real checkout that posts an order and handles domain errors
  (`INSUFFICIENT_STOCK`, `CART_EMPTY`) with friendly messages.
- Render role-based UI (admin-only links and pages).

## Session brief

Starter = the Unit 3 solution plus these auth scaffolds. Copy the `components/` and
`app/` additions into your Next.js app and complete the TODOs. Copy
`.env.local.example` to `.env.local`. **Run** with the API on `:3000`: `npm run dev`
(this app runs on `:3001`). Admin login for testing: `admin@sooqonline.local` /
`admin1234`.

## Tasks

1. **AuthContext** `applyToken(t)` — decode the JWT payload (the middle segment,
   `atob` + `JSON.parse`), reject an expired token, set the user, store the token in
   `localStorage`.
2. **AuthContext** `logout()` — clear the user, the token, and `localStorage`.
3. **Login** (`app/login/page.jsx`) — `POST /auth/login`; on `!res.ok` show
   "Wrong email or password"; otherwise `setToken(data.token)` and push to `/products`.
4. **Register** (`app/register/page.jsx`) — `POST /auth/register`, mapping
   `EMAIL_TAKEN` to a friendly message, then auto-login and redirect.
5. **Checkout guard** — if there's no token, redirect to `/login` in a `useEffect`.
6. **Place order** — `POST /orders` with
   `{ items: items.map(({ id, quantity }) => ({ productId: id, quantity })) }` via
   `authedFetch`. On success, `clear()` the cart and push to `/orders`. On error, show
   a nice message (`INSUFFICIENT_STOCK` → "Sorry, not enough stock…").
7. **My Orders** (`app/orders/page.jsx`) — authenticated `GET /orders`; list each order's
   id, date, status, items, and total.
8. **Admin products** (`app/admin/products/page.jsx`) — a table plus a create form,
   admin only. The **server** enforces `403`; hiding the page in the UI is just courtesy.

## Verify

Walk the full story end to end:

- Browse → **register** → you're logged in and the navbar greets you.
- Add items to the cart → **checkout** → the order is created and stock **decreases in
  the DB**.
- The order shows up in **My Orders** with a success banner.
- As a customer, `/admin/products` is blocked — the UI hides the link, and hitting the
  API directly returns `403`.
- **Logout** clears the greeting and the token.

## Solution walkthrough

See the [`solution/`](./solution) folder. The `AuthProvider` and `CartProvider` wrap the
whole app in `app/layout.jsx`, so both the logged-in user and the cart are available on
every page. `AuthContext.applyToken` decodes the JWT locally just to *display* the name
and role — it never trusts that for authorization. Every mutating request goes through
`authedFetch` in `lib/api.js`, which attaches the `Bearer` token. The checkout maps the
cart into the API's `{ productId, quantity }` shape and translates error codes into
human sentences. The admin page hides itself for non-admins but still relies on the
server's `403` as the real guard — exactly the lesson this milestone teaches.
