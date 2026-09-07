"use client";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

// Course choice: token in localStorage (simple to learn).
// Production apps often prefer httpOnly cookies (XSS-safe, needs CSRF care).
export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("token");
    if (saved) applyToken(saved);
  }, []);

  function decode(t) {
    try { return JSON.parse(atob(t.split(".")[1])); } catch { return null; }
  }

  function applyToken(t) {
    const payload = decode(t);
    if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) return logout();
    setUser({ userId: payload.userId, role: payload.role, name: payload.name });
    setTokenState(t);
    localStorage.setItem("token", t);
  }

  function logout() {
    setUser(null);
    setTokenState(null);
    localStorage.removeItem("token");
  }

  return (
    <AuthContext.Provider value={{ token, user, setToken: applyToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
