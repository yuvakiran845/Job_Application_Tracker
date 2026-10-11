import { createContext, useCallback, useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/format';

const MenuContext = createContext(null);
const VIEWPORT_MARGIN = 8;
const ITEM_CLASSES =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus:outline-hidden';

function getItems(menu) {
  return [...menu.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')];
}

/**
 * Accessible menu button (WAI-ARIA menu pattern). The menu renders in a portal
 * with fixed positioning so scrolling containers such as tables can't clip it.
 * Arrow keys / Home / End move focus, Escape closes and returns focus, and
 * clicking outside, scrolling or resizing closes it.
 *
 * `trigger` is a render function receiving the props for the trigger button.
 */
export function DropdownMenu({ trigger, label, align = 'end', className, children }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const triggerId = useId();
  const menuId = useId();

  const close = useCallback(({ restoreFocus = true } = {}) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const triggerElement = triggerRef.current;
    if (!open || !menu || !triggerElement) return undefined;

    // Position before paint: below the trigger, flipped above if there's no room.
    const anchor = triggerElement.getBoundingClientRect();
    const { width, height } = menu.getBoundingClientRect();
    const fitsBelow = anchor.bottom + 4 + height <= window.innerHeight - VIEWPORT_MARGIN;
    const top = fitsBelow || anchor.top - height - 4 < VIEWPORT_MARGIN ? anchor.bottom + 4 : anchor.top - height - 4;
    const preferredLeft = align === 'end' ? anchor.right - width : anchor.left;
    const left = Math.min(Math.max(VIEWPORT_MARGIN, preferredLeft), window.innerWidth - width - VIEWPORT_MARGIN);
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    getItems(menu)[0]?.focus({ preventScroll: true });

    const handlePointerDown = (event) => {
      if (!menu.contains(event.target) && !triggerElement.contains(event.target)) close({ restoreFocus: false });
    };
    const handleViewportChange = (event) => {
      if (event.type === 'scroll' && menu.contains(event.target)) return;
      close({ restoreFocus: false });
    };
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open, align, close]);

  function handleMenuKeyDown(event) {
    const items = getItems(menuRef.current);
    const index = items.indexOf(document.activeElement);
    const focusAt = (next) => items[(next + items.length) % items.length]?.focus();

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(items.length - 1);
        break;
      case 'Tab':
        // Return focus to the trigger; the browser then moves on from there.
        close();
        break;
      default:
    }
  }

  const triggerProps = {
    ref: triggerRef,
    id: triggerId,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    onClick: () => setOpen((current) => !current),
    onKeyDown: (event) => {
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !open) {
        event.preventDefault();
        setOpen(true);
      }
    },
  };

  return (
    <>
      {trigger(triggerProps)}
      {open &&
        createPortal(
          <MenuContext value={close}>
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              aria-labelledby={label ? undefined : triggerId}
              onKeyDown={handleMenuKeyDown}
              style={{ position: 'fixed', top: -9999, left: -9999 }}
              className={cn(
                'z-40 min-w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg motion-safe:animate-fade-in',
                className,
              )}
            >
              {children}
            </div>
          </MenuContext>,
          document.body,
        )}
    </>
  );
}

export function DropdownMenuItem({ icon: Icon, tone = 'default', onSelect, children }) {
  const close = useContext(MenuContext);
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={() => {
        close();
        onSelect();
      }}
      className={cn(
        ITEM_CLASSES,
        tone === 'danger'
          ? 'text-rose-700 hover:bg-rose-50 focus:bg-rose-50'
          : 'text-slate-700 hover:bg-slate-100 focus:bg-slate-100',
      )}
    >
      {Icon && (
        <Icon className={cn('size-4', tone === 'danger' ? 'text-rose-600' : 'text-slate-500')} aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

export function DropdownMenuLink({ icon: Icon, href, children }) {
  const close = useContext(MenuContext);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      role="menuitem"
      tabIndex={-1}
      onClick={() => close({ restoreFocus: false })}
      className={cn(ITEM_CLASSES, 'text-slate-700 hover:bg-slate-100 focus:bg-slate-100')}
    >
      {Icon && <Icon className="size-4 text-slate-500" aria-hidden="true" />}
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function DropdownMenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-slate-100" />;
}

export function DropdownMenuLabel({ children }) {
  return (
    <div role="none" className="px-2.5 py-2">
      {children}
    </div>
  );
}
