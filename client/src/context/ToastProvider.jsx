import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toaster } from '../components/ui/Toaster';
import { createId } from '../utils/format';
import { ToastContext } from './toastContext';

const MAX_VISIBLE = 3;
const DEFAULT_DURATION_MS = 5000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    clearTimeout(timersRef.current.get(id));
    timersRef.current.delete(id);
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'success', duration = DEFAULT_DURATION_MS }) => {
      const id = createId();
      setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), { id, title, description, variant }]);
      timersRef.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  );
}
