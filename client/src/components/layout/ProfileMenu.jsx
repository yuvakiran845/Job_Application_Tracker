import { ChevronDown, RotateCcw, UserRound } from 'lucide-react';
import { useApplications } from '../../hooks/useApplications';
import { useToast } from '../../hooks/useToast';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '../ui/DropdownMenu';

export function ProfileMenu() {
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
          <span className="grid size-8 place-items-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200">
            <UserRound className="size-4" aria-hidden="true" />
          </span>
          <ChevronDown
            className="hidden size-4 transition-transform group-aria-expanded:rotate-180 sm:block"
            aria-hidden="true"
          />
        </button>
      )}
    >
      <DropdownMenuLabel>
        <p className="text-sm font-medium text-slate-900">Guest</p>
        <p className="text-xs text-slate-500">Not signed in · development preview</p>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem icon={RotateCcw} onSelect={handleResetSampleData}>
        Reset sample data
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>
        <p className="text-xs text-slate-500">Accounts and sign-in are coming soon.</p>
      </DropdownMenuLabel>
    </DropdownMenu>
  );
}
