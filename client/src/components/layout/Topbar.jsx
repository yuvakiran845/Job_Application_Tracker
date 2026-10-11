import { Menu, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { MOBILE_NAV_ID } from './MobileNav';
import { ProfileMenu } from './ProfileMenu';

export function Topbar({ title, mobileNavOpen, onOpenMobileNav, onAddApplication }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        iconOnly
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        aria-expanded={mobileNavOpen}
        aria-controls={MOBILE_NAV_ID}
        className="-ml-2 lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>

      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-slate-900">{title}</h1>

      <div className="flex items-center gap-2 sm:gap-3">
        <Button onClick={onAddApplication} icon={Plus} className="max-sm:size-9 max-sm:px-0">
          <span className="max-sm:sr-only">Add application</span>
        </Button>
        <ProfileMenu />
      </div>
    </header>
  );
}
