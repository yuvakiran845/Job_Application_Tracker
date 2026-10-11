import { useEffect, useState } from 'react';

/**
 * Local text state for an input whose committed value lives elsewhere (e.g. the
 * URL). Typing stays instant; `onCommit` runs after `delay` ms without typing.
 * When `value` changes from outside (e.g. "Clear filters"), the text follows —
 * but echoes of our own commits never overwrite characters typed since.
 */
export function useDebouncedInput(value, onCommit, delay = 300) {
  const [text, setText] = useState(value);
  const [seenValue, setSeenValue] = useState(value);
  const [committedValue, setCommittedValue] = useState(value);

  // Adjust state while rendering when the external value changes (see React docs:
  // "Adjusting some state when a prop changes").
  if (value !== seenValue) {
    setSeenValue(value);
    if (value !== committedValue) setText(value);
  }

  useEffect(() => {
    if (text === value) return undefined;
    const timer = setTimeout(() => {
      setCommittedValue(text);
      onCommit(text);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, value, onCommit, delay]);

  return [text, setText];
}
