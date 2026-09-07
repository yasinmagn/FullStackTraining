export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function authedFetch(path, options = {}, token) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
