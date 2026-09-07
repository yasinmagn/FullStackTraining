import { useCallback, useEffect, useState } from 'react';

/**
 * A custom hook is just a function that calls other hooks.
 *
 * There is no special mechanism. The ONLY rules are:
 *   - the name starts with `use` (so lint rules can check the rest)
 *   - hooks are called unconditionally, at the top level, in the same order
 *     every render
 *
 * Custom hooks let you extract *stateful logic* (as opposed to markup, which
 * you extract into a component). Two components using this hook get two
 * independent pieces of state - hooks share logic, never state.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  /**
   * Lazy initial state. Passing a FUNCTION means React calls it once instead of
   * running `localStorage.getItem` + `JSON.parse` on every single render.
   *
   *   useState(readStorage())     <- reads on every render, result discarded
   *   useState(() => readStorage()) <- reads once
   */
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initialValue : (JSON.parse(stored) as T);
    } catch {
      // Private browsing, a disabled-storage setting, or corrupt JSON. Never
      // let persistence take the whole app down - fall back and carry on.
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded, or storage blocked. Losing persistence is acceptable;
      // crashing on a keystroke is not.
    }
  }, [key, value]);

  /**
   * Keep tabs in sync. The `storage` event fires in OTHER tabs of the same
   * origin, never in the tab that wrote the value.
   *
   * The cleanup function is not optional. Without it, every remount adds
   * another listener - a leak that also fires stale setters. React's
   * StrictMode double-mounts in development precisely to make you notice.
   */
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || event.newValue === null) return;
      try {
        setValue(JSON.parse(event.newValue) as T);
      } catch {
        /* another tab wrote something we cannot read - ignore it */
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    setValue(initialValue);
    // `initialValue` is intentionally read fresh; if a caller passes an inline
    // object literal it changes identity every render, which is why this hook
    // is best used with a primitive or a module-level constant.
  }, [key, initialValue]);

  return { value, setValue, clear } as const;
}
