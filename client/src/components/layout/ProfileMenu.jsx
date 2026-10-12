import { useNavigate } from 'react-router';
import { LogOut, RotateCcw, UserCog, UserRound } from 'lucide-react';
import { IS_MOCK_DATA } from '../../config';
import { useResetSampleData } from '../../hooks/useApplicationData';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getInitials } from '../../utils/format';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '../ui/DropdownMenu';

export function ProfileMenu() {
  const { user, enabled: authEnabled, logout } = useAuth();
  const resetSampleData = useResetSampleData();
  const navigate = useNavigate();
  const { toast } = useToast();

  async function handleResetSampleData() {
    try {
      await resetSampleData.mutateAsync();
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
          className="group flex shrink-0 cursor-pointer rounded-full"
        >
          <span className="grid size-10 place-items-center rounded-full bg-emerald-700 text-sm font-semibold text-white transition-colors group-hover:bg-emerald-800">
            {initials || <UserRound className="size-4" aria-hidden="true" />}
          </span>
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
        <>
          <DropdownMenuItem icon={UserCog} onSelect={() => navigate('/account')}>
            Account settings
          </DropdownMenuItem>
          <DropdownMenuItem icon={LogOut} onSelect={handleSignOut}>
            Sign out
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );
}
