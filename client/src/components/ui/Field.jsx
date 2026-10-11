import { useState } from 'react';
import { ChevronDown, CircleAlert, Eye, EyeOff } from 'lucide-react';
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

export function TextInput({ icon: Icon, className, ...props }) {
  if (!Icon) return <input className={cn(CONTROL_CLASSES, 'h-9 px-3', className)} {...props} />;
  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input className={cn(CONTROL_CLASSES, 'h-9 pr-3 pl-9', className)} {...props} />
    </div>
  );
}

/** Password input with a show/hide toggle (reduces typos without a "confirm password" field). */
export function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        className={cn(CONTROL_CLASSES, 'h-9 pr-10 pl-3', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute top-1/2 right-1 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

/** Groups related form fields under a visible legend. */
export function FormSection({ title, description, children }) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-slate-900">{title}</legend>
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      <div className="mt-3 grid gap-x-4 gap-y-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
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
