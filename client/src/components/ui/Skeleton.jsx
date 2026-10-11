import { cn } from '../../utils/format';

export function Skeleton({ className }) {
  return <div className={cn('rounded-md bg-slate-200/70 motion-safe:animate-pulse', className)} aria-hidden="true" />;
}
