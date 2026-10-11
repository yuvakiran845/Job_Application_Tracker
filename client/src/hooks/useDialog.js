import { useCallback, useEffect, useRef } from 'react';

/**
 * Drives a native <dialog> element as a modal: showModal() makes the rest of the
 * page inert and traps focus. This hook adds Escape/backdrop dismissal through
 * `onClose`, initial focus on `[data-autofocus]`, and focus restoration.
 */
export function useDialog({ open, onClose }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const pressStartedOnBackdrop = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return undefined;

    const previouslyFocused = document.activeElement;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[data-autofocus]')?.focus();

    const handleCancel = (event) => {
      // Escape: let React state decide whether the dialog closes.
      event.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener('cancel', handleCancel);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      if (dialog.open) dialog.close();
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  // A click on the dialog element itself (not its content) is a click on the backdrop.
  // Tracking where the press started avoids closing after a text selection drag.
  const onPointerDown = useCallback((event) => {
    pressStartedOnBackdrop.current = event.target === event.currentTarget;
  }, []);

  const onClick = useCallback((event) => {
    if (pressStartedOnBackdrop.current && event.target === event.currentTarget) {
      onCloseRef.current();
    }
    pressStartedOnBackdrop.current = false;
  }, []);

  return { dialogRef, backdropProps: { onPointerDown, onClick } };
}
