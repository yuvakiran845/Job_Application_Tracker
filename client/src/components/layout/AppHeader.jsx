import { Menu, Plus } from 'lucide-react';
import { useApplicationActions } from '../../hooks/useApplicationActions';
import { Button } from '../ui/Button';
import { Logo } from './Logo';
import { MOBILE_NAV_ID } from './MobileNav';
import { NavLinks } from './NavLinks';
import { ProfileMenu } from './ProfileMenu';

/** Top bar: logo, main navigation (a drawer below `lg`), Add Job, and the profile menu. */
export function AppHeader({ mobileNavOpen, onOpenMobileNav }) {
  const { openAdd } = useApplicationActions();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
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

        <Logo />

        <nav aria-label="Main" className="hidden min-w-0 flex-1 justify-center lg:flex">
          <NavLinks />
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 lg:ml-0">
          <Button onClick={openAdd} icon={Plus} size="lg" className="font-semibold max-sm:size-10 max-sm:px-0">
            <span className="max-sm:sr-only">Add Job</span>
          </Button>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
