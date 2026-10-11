import { cn } from '../../utils/format';
import { getToneStyles } from './tones';

export function Badge({ tone = 'neutral', dot = false, className, children }) {
  const styles = getToneStyles(tone);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        styles.badge,
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', styles.dot)} aria-hidden="true" />}
      {children}
    </span>
  );
}
