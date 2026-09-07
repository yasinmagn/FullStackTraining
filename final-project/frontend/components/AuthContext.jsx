// "use client" marks this as a CLIENT Component: it runs in the browser and can
// use hooks (useState/useEffect), localStorage, and event handlers. Server
// Components (the default) can't do those things.
"use client";
import { createContext, useContext, useEffect, useState } from "react";

// React Context lets us share auth state (token/user) with the whole app without
// passing props down through every component ("prop drilling").
const AuthContext = createContext(null);

// Course choice: token in localStorage (simple to learn).
// Production apps often prefer httpOnly cookies (XSS-safe, needs CSRF care).
// AuthProvider holds the login state and exposes helpers to its children.
export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);

  // On first load, restore a previously saved token so a refresh keeps you logged in.
  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("token");
    if (saved) applyToken(saved);
  }, []);

  // A JWT is three dot-separated parts; the middle part is base64-encoded JSON.
  // We decode it (no verification here — the server already verified it) to read
  // the user's id/role/name for the UI.
  function decode(t) {
    try { return JSON.parse(atob(t.split(".")[1])); } catch { return null; }
  }

  // Accept a token: validate expiry, store the user in state, and persist it.
  function applyToken(t) {
    const payload = decode(t);
    // exp is in seconds; compare against now (ms). Expired/invalid -> log out.
    if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) return logout();
    setUser({ userId: payload.userId, role: payload.role, name: payload.name });
    setTokenState(t);
    localStorage.setItem("token", t); // survive page reloads
  }

  // Clear everything on logout.
  function logout() {
    setUser(null);
    setTokenState(null);
    localStorage.removeItem("token");
  }

  return (
    // Everything in `value` becomes available to children via useAuth().
    <AuthContext.Provider value={{ token, user, setToken: applyToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
// Convenience hook so components call useAuth() instead of useContext(AuthContext).
export const useAuth = () => useContext(AuthContext);
