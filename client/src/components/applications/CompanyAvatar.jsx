import { getInitials } from '../../utils/format';

export function CompanyAvatar({ name }) {
  return (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-xs font-semibold text-brand-700"
      aria-hidden="true"
    >
      {getInitials(name) || '?'}
    </span>
  );
}
