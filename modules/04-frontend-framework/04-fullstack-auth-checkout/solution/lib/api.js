// Base URL of our backend API.
// NEXT_PUBLIC_ variables are exposed to the browser (client-side code), so the
// frontend can read this. If it's not set, we fall back to localhost for dev.
export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Helper for calling protected (login-required) API routes.
// It wraps fetch() and automatically attaches the logged-in user's token.
export function authedFetch(path, options = {}, token) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      // If we have a token, send it as a "Bearer" token in the Authorization
      // header. The server reads this to know WHO is making the request and
      // whether they're allowed to (e.g. admin-only actions).
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
