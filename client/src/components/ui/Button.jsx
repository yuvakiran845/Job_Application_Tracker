import { Link } from 'react-router';
import { LoaderCircle } from 'lucide-react';
import { buttonClasses } from './buttonStyles';

export function Button({
  variant,
  size,
  iconOnly,
  loading = false,
  icon: Icon,
  type = 'button',
  disabled,
  className,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, iconOnly, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon className="size-4" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, iconOnly, icon: Icon, className, children, ...props }) {
  return (
    <Link className={buttonClasses({ variant, size, iconOnly, className })} {...props}>
      {Icon && <Icon className="size-4" aria-hidden="true" />}
      {children}
    </Link>
  );
}
