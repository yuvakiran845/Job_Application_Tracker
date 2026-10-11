import { APPLICATION_SOURCES, getOptionLabel } from '../../constants/applications';

/**
 * Applications by source as labelled horizontal bars (one hue: this is magnitude,
 * not identity). Every bar carries its label and value as text.
 */
export function SourceBreakdown({ bySource, total }) {
  const max = Math.max(1, ...bySource.map((item) => item.count));
  return (
    <ul className="space-y-3">
      {bySource.map(({ source, count }) => {
        const label = getOptionLabel(APPLICATION_SOURCES, source) || 'Not specified';
        return (
          <li key={source || 'none'}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{label}</span>
              <span className="shrink-0 text-slate-900 tabular-nums">
                {count}
                <span className="ml-1 text-xs text-slate-500">({Math.round((count / total) * 100)}%)</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-slate-100" aria-hidden="true">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${(count / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
