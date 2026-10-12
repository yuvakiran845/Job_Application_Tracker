import { Link } from 'react-router';
import { BriefcaseBusiness } from 'lucide-react';
import { cn } from '../../utils/format';

export const APP_NAME = 'My Job Trackr';

export function LogoMark({ className }) {
  return (
    <span
      className={cn('grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-xs', className)}
      aria-hidden="true"
    >
      <BriefcaseBusiness className="size-5" strokeWidth={2.2} />
    </span>
  );
}

export function Logo({ onNavigate }) {
  return (
    <Link
      to="/"
      onClick={onNavigate}
      className="flex shrink-0 items-center gap-2.5 rounded-lg text-lg font-bold tracking-tight text-slate-900"
      aria-label={`${APP_NAME} home`}
    >
      <LogoMark />
      <span>{APP_NAME}</span>
    </Link>
  );
}
