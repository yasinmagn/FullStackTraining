# Unit 4 — Auth & JWT (Milestone 2)

## Introduction

Right now anyone can claim to be any user just by sending an `x-user-id` header, and
anyone can create or delete products. In this final unit you make the API secure:
users **register** with a hashed password, **log in** to receive a JSON Web Token,
and send that token on every protected request. Middleware verifies the token and
enforces roles, so only admins can modify the catalog.

The starter carries over the working cart and orders from the previous unit; your
job is to add real authentication and swap out the `x-user-id` hack.

## Learning objectives

- Hash and verify passwords with `bcryptjs` (never store plaintext).
- Issue signed, expiring JSON Web Tokens with `jsonwebtoken`.
- Write `requireAuth` middleware that reads a `Bearer` token and populates `req.user`.
- Write `requireAdmin` middleware for role-based access control.
- Return safe, uniform error messages (don't leak whether an email exists).

## Session brief

The starter is the previous unit's solution (cart/orders working via the `x-user-id`
header), with the auth pieces stubbed out. Run `npm install`, then copy
`.env.example` to `.env` and set **your own** long random `JWT_SECRET`. Complete
`services/auth.js` and `middleware/auth.js`, replace the `x-user-id` hack with real
auth, and protect the admin product routes.

> An admin user is seeded at startup (`admin@sooqonline.local` / `admin1234`) so you
> can test role-protected routes immediately.

## Tasks

1. `services/auth.js` → `register(name, email, password)`:
   - email must contain `"@"` → else throw `Error("INVALID_EMAIL")`
   - `password.length >= 8` → else throw `Error("WEAK_PASSWORD")`
   - email not already used → else throw `Error("EMAIL_TAKEN")`
   - hash with bcrypt (10 rounds), role `"customer"`
   - return `{ id, name, email }` — **never** the hash.
2. `login(email, password)`:
   - find the user and `bcrypt.compare` the password
   - wrong email **or** wrong password → throw `Error("INVALID_CREDENTIALS")` (same message either way)
   - return `jwt.sign({ userId, role, name }, process.env.JWT_SECRET, { expiresIn: "2h" })`.
3. `middleware/auth.js` → `requireAuth`:
   - read the `Authorization: Bearer <token>` header; missing → `401 { error: "Login required" }`
   - `jwt.verify` with `JWT_SECRET`, put the payload on `req.user`, call `next()`
   - invalid/expired → `401 { error: "Invalid or expired token" }`.
4. `requireAdmin` (assumes `requireAuth` ran first): `req.user.role !== "admin"` →
   `403 { error: "Admins only" }`.
5. In `server.js`, delete the old `x-user-id` middleware and protect `/cart` and
   `/orders` with `requireAuth` (controllers now read `req.user.userId`).
6. In `routes/products.js`, protect `POST` / `PUT` / `DELETE` with `requireAuth` +
   `requireAdmin`. `GET` routes stay public — anyone can browse the shop.

## Verify

- `POST /auth/register` then `POST /auth/login` returns a token.
- Sending the token as `Authorization: Bearer <token>` works on `/cart` and `/orders`.
- No token on `/cart` → `401`.
- A customer token on `POST /products` → `403`.
- A wrong password returns the **same** message as a wrong email (`INVALID_CREDENTIALS`).

## Solution walkthrough

See [`solution/`](./solution). Passwords are hashed with `bcrypt.hash(password, 10)`
and only the derived `{ id, name, email }` is returned from `register`. `login`
throws the identical `INVALID_CREDENTIALS` error for both an unknown email and a bad
password, so an attacker can't enumerate accounts. The JWT payload carries
`userId`, `role`, and `name`; `requireAuth` verifies it and stores it on `req.user`,
and the cart/orders controllers read `req.user.userId`. Product write routes chain
`requireAuth, requireAdmin` while the `GET` routes stay open.
