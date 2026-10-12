import { X } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';
import { Button } from '../ui/Button';
import { Logo } from './Logo';
import { NavLinks } from './NavLinks';

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
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
            <Logo onNavigate={onClose} />
            <Button variant="ghost" size="sm" iconOnly onClick={onClose} aria-label="Close navigation" className="-mr-1">
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto p-3">
            <NavLinks orientation="vertical" onNavigate={onClose} />
          </nav>
        </div>
      )}
    </dialog>
  );
}
