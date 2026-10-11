import { ChevronDown, LogOut, RotateCcw, UserRound } from 'lucide-react';
import { IS_MOCK_DATA } from '../../config';
import { useApplications } from '../../hooks/useApplications';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getInitials } from '../../utils/format';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '../ui/DropdownMenu';

export function ProfileMenu() {
  const { user, enabled: authEnabled, logout } = useAuth();
  const { resetToSampleData } = useApplications();
  const { toast } = useToast();

  async function handleResetSampleData() {
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

  async function handleSignOut() {
    try {
      // The route guard sends the user to the sign-in page once the session is gone.
      await logout();
    } catch (error) {
      toast({ variant: 'error', title: 'Couldn’t sign out', description: error.message });
    }
  }

  const initials = authEnabled ? getInitials(user?.name ?? '') : '';

  return (
    <DropdownMenu
      className="w-64"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label="Profile menu"
          className="group flex cursor-pointer items-center gap-1 rounded-full p-0.5 text-slate-500 transition-colors hover:text-slate-700 sm:pr-1.5"
        >
          <span className="grid size-8 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {initials || <UserRound className="size-4" aria-hidden="true" />}
          </span>
          <ChevronDown
            className="hidden size-4 transition-transform group-aria-expanded:rotate-180 sm:block"
            aria-hidden="true"
          />
        </button>
      )}
    >
      <DropdownMenuLabel>
        <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
        <p className="truncate text-xs text-slate-500">{authEnabled ? user?.email : 'Not signed in · sample data'}</p>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {IS_MOCK_DATA && (
        <DropdownMenuItem icon={RotateCcw} onSelect={handleResetSampleData}>
          Reset sample data
        </DropdownMenuItem>
      )}
      {authEnabled && (
        <DropdownMenuItem icon={LogOut} onSelect={handleSignOut}>
          Sign out
        </DropdownMenuItem>
      )}
    </DropdownMenu>
  );
}
