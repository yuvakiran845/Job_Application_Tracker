import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, RotateCcw, UserRound } from 'lucide-react';
import { useApplications } from '../../hooks/useApplications';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/format';

function getMenuItems(menu) {
  return [...menu.querySelectorAll('[role="menuitem"]:not([disabled])')];
}

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const buttonId = useId();
  const menuId = useId();
  const { resetToSampleData } = useApplications();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return undefined;

    getMenuItems(menuRef.current)[0]?.focus();

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  function closeMenu() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleMenuKeyDown(event) {
    const items = getMenuItems(menuRef.current);
    const index = items.indexOf(document.activeElement);

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeMenu();
        break;
      case 'ArrowDown':
        event.preventDefault();
        items[(index + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        items.at(-1)?.focus();
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
    }
  }

  function handleButtonKeyDown(event) {
    if (event.key === 'ArrowDown' && !open) {
      event.preventDefault();
      setOpen(true);
    }
  }

  async function handleResetSampleData() {
    closeMenu();
    try {
      await resetToSampleData();
      toast({
        variant: 'info',
        title: 'Sample data restored',
        description: 'The workspace is back to the original development sample data.',
      });
    } catch {
      toast({ variant: 'error', title: 'Couldn’t reset sample data', description: 'Please try again.' });
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="Profile menu"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleButtonKeyDown}
        className="flex cursor-pointer items-center gap-1 rounded-full p-0.5 text-slate-500 transition-colors hover:text-slate-700 sm:pr-1.5"
      >
        <span className="grid size-8 place-items-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200">
          <UserRound className="size-4" aria-hidden="true" />
        </span>
        <ChevronDown
          className={cn('hidden size-4 transition-transform sm:block', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg motion-safe:animate-fade-in"
        >
          <div role="none" className="px-2.5 py-2">
            <p className="text-sm font-medium text-slate-900">Guest</p>
            <p className="text-xs text-slate-500">Not signed in · development preview</p>
          </div>
          <div role="separator" className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={handleResetSampleData}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-hidden"
          >
            <RotateCcw className="size-4 text-slate-500" aria-hidden="true" />
            Reset sample data
          </button>
          <div role="separator" className="my-1 h-px bg-slate-100" />
          <p role="none" className="px-2.5 py-2 text-xs text-slate-500">
            Accounts and sign-in are coming soon.
          </p>
        </div>
      )}
    </div>
  );
}
