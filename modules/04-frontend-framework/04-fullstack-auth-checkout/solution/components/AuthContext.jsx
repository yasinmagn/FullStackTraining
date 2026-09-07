// Client Component: React Context with state + localStorage lives in the browser.
"use client";
import { createContext, useContext, useEffect, useState } from "react";

// A React Context is a shared "box" of data. Any component inside the provider
// can read it via useAuth(), so we don't have to pass the user down through
// every component as props (this avoids "prop-drilling"). This particular
// context holds the LOGGED-IN USER and their token for the whole app.
const AuthContext = createContext(null);

// Course choice: token in localStorage (simple to learn).
// Production apps often prefer httpOnly cookies (XSS-safe, needs CSRF care).
export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);

  // On first load in the browser, restore the session from a saved token so the
  // user stays logged in after a refresh.
  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("token");
    if (saved) applyToken(saved);
  }, []);

  // The token is a JWT: three dot-separated parts. The middle part is the
  // "payload" holding info like the user's id, name and role. This just reads
  // that info; it does NOT verify the token — only the server can truly trust it.
  function decode(t) {
    try { return JSON.parse(atob(t.split(".")[1])); } catch { return null; }
  }

  // Accept a token: remember the user, keep the token in state, and save it to
  // localStorage so it survives page refreshes. Expired/invalid tokens log out.
  function applyToken(t) {
    const payload = decode(t);
    if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) return logout();
    // We read "role" here so the UI can, e.g., show the admin link only to admins.
    setUser({ userId: payload.userId, role: payload.role, name: payload.name });
    setTokenState(t);
    localStorage.setItem("token", t);
  }

  // Log out: forget the user everywhere and remove the saved token.
  function logout() {
    setUser(null);
    setTokenState(null);
    localStorage.removeItem("token");
  }

  // Everything in "value" becomes available to any component via useAuth().
  return (
    <AuthContext.Provider value={{ token, user, setToken: applyToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
// Handy shortcut so components can just call useAuth() instead of useContext(...).
export const useAuth = () => useContext(AuthContext);
