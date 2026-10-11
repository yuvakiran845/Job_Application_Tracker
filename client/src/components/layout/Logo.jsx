import { Link } from 'react-router';
import { cn } from '../../utils/format';

export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('size-8 shrink-0', className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-brand-600" />
      <path
        d="M9 20.5c2.2 0 3.4-1.2 4.4-3.1l1.4-2.8c1-1.9 2.2-3.1 4.4-3.1H23"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="m20 8.5 3.2 3-3.2 3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="20.5" r="1.9" fill="#fff" />
    </svg>
  );
}

export function Logo({ collapsed = false, onNavigate }) {
  return (
    <Link
      to="/"
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-lg text-base font-semibold tracking-tight text-slate-900"
      aria-label="CareerFlow home"
    >
      <LogoMark />
      {!collapsed && <span>CareerFlow</span>}
    </Link>
  );
}
