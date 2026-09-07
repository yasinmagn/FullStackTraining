// Base URL for our backend API. We read it from an environment variable so the
// same code works in different setups (local dev, production, etc.).
// The NEXT_PUBLIC_ prefix is required by Next.js to expose a variable to the
// browser (client) side — without it the value is only available on the server.
// The || provides a fallback default when the env var isn't set.
export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
