// Small helper module for talking to the backend API from the frontend.

// Base URL of the backend. NEXT_PUBLIC_ vars are exposed to the browser; we fall
// back to localhost for local development.
export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// authedFetch wraps fetch and automatically attaches the JWT so protected routes
// (cart, orders, admin writes) accept the request. Use this instead of raw fetch
// whenever the call needs the logged-in user's token.
export function authedFetch(path, options = {}, token) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      // Only add the Authorization header when we actually have a token.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
