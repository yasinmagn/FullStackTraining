# Unit 2 — React State Management

## Introduction

In Unit 1 the cart lived in a single component's `useState`. That works until other
components — a header badge, a separate cart panel — also need the cart. Passing it
down through props gets painful fast (*prop drilling*). This unit teaches the two
tools that solve it cleanly: **`useReducer`** for organizing complex state
transitions, and the **Context API** for sharing state across the tree. This is the
exact pattern the Next.js labs (Units 3 & 4) use for `CartContext` and `AuthContext`.

## Learning objectives

- Choose between `useState` and `useReducer` for a given piece of state.
- Model state changes as a **pure reducer**: `(state, action) => nextState`.
- Update state **immutably** — spread / `map` / `filter`, never mutate.
- Share state without prop drilling using **Context** and a custom `useCart()` hook.
- Compute **derived state** (count, total) instead of storing it.

## Concepts

### `useState` vs `useReducer`
`useState` is perfect for one simple value. When state has several related fields or
several kinds of update (add, change quantity, remove, clear), a **reducer** keeps all
the transition logic in one testable place and components just *dispatch* actions.

### Immutability
React re-renders when state *identity* changes. If you mutate the existing array
(`items.push(...)`), the reference is the same and the UI may not update. Always return
a new array/object — that's why every reducer branch uses `...`, `map`, or `filter`.

### Context = no prop drilling
`createContext` + a `Provider` make a value available to *any* descendant. A custom
hook (`useCart`) reads it with `useContext` and hides the wiring. In this app the
`Header`, `Catalog`, and `Cart` all read the cart directly — `App` never passes a
single cart prop.

## Session brief

Starter = a Vite + React app where the components already consume a `useCart()` hook,
but the reducer and the context provider are stubbed. Your job is to implement them so
the cart works across the header, catalog, and cart panel.

Run it (see [`HOW-TO-RUN.md`](./HOW-TO-RUN.md)) — you'll see an empty, non-working cart
until you complete the TODOs.

## Tasks

In `starter/src/cartReducer.js`:
1. `ADD` — add a product or bump its quantity (immutably).
2. `SET_QUANTITY` — set a quantity; `<= 0` removes the item.
3. `REMOVE` — filter an item out.
4. `CLEAR` — empty the cart.

In `starter/src/CartContext.jsx`:
5. Create the reducer state with `useReducer(cartReducer, initialCart)`.
6. Write the `addItem` / `removeItem` / `setQuantity` / `clear` action helpers.
7. Derive `count` and `total` from `items` with `reduce`.
8. Provide everything through `CartContext.Provider`.
9. Implement the `useCart()` custom hook (throw if used outside the provider).

## Verify

- Adding a product updates the header count/total **and** the cart panel at once.
- The `+` / `−` buttons change quantity; `−` to 0 removes the row.
- "Remove" and "Clear cart" work.
- Out-of-stock products have a disabled button.
- No component receives the cart via props — everything flows through context.

## Solution walkthrough

See [`solution/`](./solution). The reducer holds every transition as a pure function,
so it could be unit-tested with no React at all. `CartProvider` wires the reducer to
Context and exposes friendly helpers plus derived `count`/`total` (computed on each
render, never stored). `useCart()` is the single entry point components use — the same
shape you'll see again as `CartContext`/`AuthContext` in the Next.js units.
