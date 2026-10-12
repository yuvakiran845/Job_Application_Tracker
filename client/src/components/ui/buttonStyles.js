import { cn } from '../../utils/format';

const BASE =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50';

const VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-xs hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'bg-white text-slate-700 shadow-xs ring-1 ring-slate-300 ring-inset hover:bg-slate-50 hover:text-slate-900',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-rose-700 text-white shadow-xs hover:bg-rose-800',
};

const SIZES = {
  sm: 'h-8 px-3',
  md: 'h-9 px-3.5',
  lg: 'h-10 px-4',
};

const ICON_SIZES = {
  sm: 'size-8',
  md: 'size-9',
  lg: 'size-10',
};

export function buttonClasses({ variant = 'primary', size = 'md', iconOnly = false, className } = {}) {
  return cn(BASE, VARIANTS[variant], iconOnly ? ICON_SIZES[size] : SIZES[size], className);
}
