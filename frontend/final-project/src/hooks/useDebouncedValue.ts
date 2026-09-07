import { useEffect, useState } from 'react';

/**
 * Return `value`, but only after it has stopped changing for `delayMs`.
 *
 * The canonical use is a search box: you want the input to update on every
 * keystroke (so typing feels instant) while the expensive work - a filter over
 * 10,000 rows, or an API call - runs only once the user pauses.
 *
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useDebouncedValue(query, 300);
 *   const results = useMemo(() => search(debouncedQuery), [debouncedQuery]);
 *
 * The CLEANUP is the entire mechanism. On every change React runs the previous
 * cleanup before the new effect, so the pending timer is cancelled and only the
 * last one survives. Delete the `return` and you get every intermediate value,
 * each delayed by 300ms - the exact opposite of what you wanted.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
