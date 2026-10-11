// Colour treatments shared by badges, legend dots and chart segments.
export const TONE_STYLES = {
  neutral: { badge: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-500' },
  brand: { badge: 'bg-brand-50 text-brand-700 ring-brand-200', dot: 'bg-brand-500' },
  warning: { badge: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  violet: { badge: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  success: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  danger: { badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  muted: { badge: 'bg-white text-slate-600 ring-slate-300', dot: 'bg-slate-300' },
};

export function getToneStyles(tone) {
  return TONE_STYLES[tone] ?? TONE_STYLES.neutral;
}
