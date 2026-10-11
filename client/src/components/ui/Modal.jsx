import { useId } from 'react';
import { X } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';
import { cn } from '../../utils/format';
import { Button } from './Button';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

/**
 * Accessible modal built on the native <dialog> element. Content is mounted only
 * while open, so forms inside start fresh each time. Compose with ModalBody and
 * ModalFooter (place them inside a <form> when the footer holds a submit button).
 */
export function Modal({ open, onClose, title, description, size = 'md', children }) {
  const titleId = useId();
  const descriptionId = useId();
  const { dialogRef, backdropProps } = useDialog({ open, onClose });

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-xl border-0 bg-white p-0 text-slate-900 shadow-xl ring-1 ring-slate-900/5 motion-safe:open:animate-dialog-in',
        SIZES[size],
      )}
      {...backdropProps}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold text-slate-900">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-slate-600">
                  {description}
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" iconOnly onClick={onClose} aria-label="Close dialog" className="-mr-2">
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ModalBody({ className, children }) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6', className)}>{children}</div>;
}

export function ModalFooter({ className, children }) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
