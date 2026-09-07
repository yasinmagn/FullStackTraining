"use client";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

// Course-level choice: token in localStorage (simple). Know the trade-off:
// production apps often use httpOnly cookies (XSS-safe, needs CSRF care).
export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null); // { userId, role, name } from the JWT payload

  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("token");
    if (saved) applyToken(saved);
  }, []);

  // TODO 1: applyToken(t) — decode the payload (middle part of the JWT, atob + JSON.parse),
  // reject an expired token (payload.exp * 1000 < Date.now()), setUser with { userId, role, name },
  // setTokenState(t), and save to localStorage.
  function applyToken(t) {
  }

  // TODO 2: logout() — clear state + localStorage
  function logout() {
  }

  return (
    <AuthContext.Provider value={{ token, user, setToken: applyToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
