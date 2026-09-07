# Module 04 — Frontend Framework

**React · Next.js · Client & Server Components · Auth**

In this module you rebuild the SooqOnline storefront on a real frontend framework.
You start with a Vite + React single-page app that talks to your API, graduate to a
server-rendered Next.js App Router shop with Tailwind, and finish with the full-stack
milestone: registration, login, a real checkout that decrements stock, order history,
and an admin-only products page.

Every unit talks to the SooqOnline API from the backend module (running on
`http://localhost:3000`). Start that API first, then run the frontend.

## Learning objectives

By the end of this module you will be able to:

- Build a React SPA with hooks (`useState`, `useEffect`) and lift state into components.
- Fetch data from an API, and handle loading and error states.
- Manage shared state with React Context (cart, auth).
- Use the Next.js App Router: server vs client components, `loading`/`error` files,
  dynamic routes, and server-side data fetching.
- Wire real authentication (JWT), a protected checkout, and role-based UI.

## Units

| # | Unit | You will build |
|---|------|----------------|
| 1 | [React Shop](./01-react-shop) | Vite + React SPA: fetch products, live search, cart |
| 2 | [React State Management](./02-react-state-management) | Context, reducers, and shared state patterns |
| 3 | [Next.js Shop](./03-nextjs-shop) | Next.js App Router + Tailwind shop (server-rendered) |
| 4 | [Fullstack Auth & Checkout](./04-fullstack-auth-checkout) *(Milestone 4)* | Auth, checkout, orders, admin |

## How each unit works

Each unit folder has:
- `README.md` — the lesson (objectives, tasks, verify checklist).
- `starter/` — copy this and complete the numbered TODOs.
- `solution/` — the complete reference once you're done (or stuck).

Work through the units in order — each starter builds on the previous solution.

## Prerequisites

- Node.js 18+ and npm.
- The SooqOnline API running on `http://localhost:3000` (from the backend module).
- Never commit a real `.env` / `.env.local`. Copy `.env.local.example` to `.env.local`
  locally — the example only carries the public API URL placeholder.
