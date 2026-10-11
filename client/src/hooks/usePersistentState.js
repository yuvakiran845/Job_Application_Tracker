import { useEffect, useState } from 'react';

/**
 * useState that remembers a small UI preference (e.g. sidebar collapsed) in
 * localStorage. Falls back to `initialValue` when storage is unavailable.
 * Not for application data.
 */
export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initialValue : JSON.parse(stored);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage blocked or full — the preference simply won't persist.
    }
  }, [key, value]);

  return [value, setValue];
}
