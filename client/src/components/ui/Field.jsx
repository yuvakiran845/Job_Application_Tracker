import { ChevronDown, CircleAlert } from 'lucide-react';
import { cn } from '../../utils/format';

const CONTROL_CLASSES =
  'block w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-900 shadow-xs transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:border-rose-500 aria-[invalid=true]:focus:ring-rose-500/20';

/**
 * Label + control + hint/error wrapper. The control is rendered by `children`,
 * a function that receives the id and ARIA attributes it must spread.
 */
export function Field({ id, label, required = false, optional = false, hint, error, className, children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
        {required && (
          <span className="text-rose-600" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {optional && <span className="font-normal text-slate-500"> (optional)</span>}
      </label>
      {children({
        id,
        required,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {hint && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-xs font-medium text-rose-700">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({ className, ...props }) {
  return <input className={cn(CONTROL_CLASSES, 'h-9 px-3', className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn(CONTROL_CLASSES, 'min-h-24 px-3 py-2', className)} {...props} />;
}

export function Select({ className, options, placeholder, ...props }) {
  return (
    <div className="relative">
      <select className={cn(CONTROL_CLASSES, 'h-9 appearance-none pr-9 pl-3', className)} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500"
        aria-hidden="true"
      />
    </div>
  );
}
