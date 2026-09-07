import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, type User } from '../api/client.ts';

/**
 * AUTH STATE.
 *
 * =============================================================================
 * WHERE THE TOKEN LIVES, AND WHY THAT IS A COMPROMISE
 * =============================================================================
 * This stores the access token in `localStorage`, which is the common choice
 * for a token-based SPA and is NOT the most secure option. Be honest about it:
 *
 *   localStorage      readable by ANY JavaScript on the page. One XSS - your
 *                     code, or any dependency you shipped - and the token is
 *                     gone. Survives a reload, works across tabs, simple.
 *
 *   memory only       cleared on reload, so the user logs in again every time.
 *                     Immune to persistent theft, still readable by XSS while
 *                     the page is open.
 *
 *   httpOnly cookie   JavaScript CANNOT read it, so XSS cannot steal it. The
 *                     browser attaches it automatically - which is exactly why
 *                     you then need CSRF protection (SameSite=Lax plus a token
 *                     on state-changing requests).
 *
 * For production, an httpOnly cookie with `SameSite=Lax` and `Secure` plus CSRF
 * protection is the better default. It is Exercise 3 in the README.
 *
 * The mitigation that matters either way: the access token is SHORT-LIVED
 * (15 minutes), so a stolen one has a small window.
 * =============================================================================
 */

const TOKEN_KEY = 'taskmanager:accessToken';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, displayName: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    // Private browsing, or storage disabled. Losing persistence is acceptable;
    // crashing on startup is not.
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy initialiser: reads storage once, not on every render.
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [user, setUser] = useState<User | null>(null);

  const persist = useCallback((nextToken: string | null) => {
    setToken(nextToken);
    try {
      if (nextToken) window.localStorage.setItem(TOKEN_KEY, nextToken);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable - the session still works for this tab */
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.login({ email, password });
      setUser(result.user);
      persist(result.accessToken);
    },
    [persist],
  );

  const register = useCallback(
    async (email: string, displayName: string, password: string) => {
      const result = await api.register({ email, displayName, password });
      setUser(result.user);
      persist(result.accessToken);
    },
    [persist],
  );

  const logout = useCallback(() => {
    setUser(null);
    persist(null);
  }, [persist]);

  /*
   * `useMemo` here is doing real work, unlike most useMemo calls.
   *
   * Without it the context value is a NEW OBJECT every render, so every
   * consumer re-renders on every parent render regardless of whether anything
   * they use has changed. The callbacks are already stable via useCallback,
   * which is what makes the memo effective.
   */
  const value = useMemo<AuthState>(
    () => ({ user, token, isAuthenticated: token !== null, login, register, logout }),
    [user, token, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Throws outside the provider, so the return type is non-nullable and the
 * error names the actual mistake instead of surfacing later as
 * "cannot read property token of null".
 */
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/**
 * A token that is present but rejected means the session ended - expired, or
 * the account was deleted. The UI should log out rather than showing an error
 * the user cannot act on.
 */
export function isSessionExpired(error: unknown): boolean {
  return error instanceof ApiError && error.isUnauthenticated;
}
