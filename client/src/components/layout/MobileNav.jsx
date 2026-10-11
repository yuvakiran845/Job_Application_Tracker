import { X } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';
import { Button } from '../ui/Button';
import { Sidebar } from './Sidebar';

export const MOBILE_NAV_ID = 'mobile-navigation';

/** Off-canvas navigation drawer for screens narrower than the `lg` breakpoint. */
export function MobileNav({ open, onClose }) {
  const { dialogRef, backdropProps } = useDialog({ open, onClose });

  return (
    <dialog
      ref={dialogRef}
      id={MOBILE_NAV_ID}
      aria-label="Navigation"
      className="m-0 h-dvh max-h-dvh w-72 max-w-[calc(100%-3rem)] border-0 border-r border-slate-200 bg-white p-0 shadow-xl motion-safe:open:animate-drawer-in lg:hidden"
      {...backdropProps}
    >
      {open && (
        <Sidebar
          onNavigate={onClose}
          headerAction={
            <Button variant="ghost" size="sm" iconOnly onClick={onClose} aria-label="Close navigation" className="-mr-2">
              <X className="size-4" aria-hidden="true" />
            </Button>
          }
        />
      )}
    </dialog>
  );
}
