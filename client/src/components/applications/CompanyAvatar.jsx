import { getInitials } from '../../utils/format';

export function CompanyAvatar({ name }) {
  return (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 ring-inset"
      aria-hidden="true"
    >
      {getInitials(name) || '?'}
    </span>
  );
}
