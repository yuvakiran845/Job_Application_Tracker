import { useId, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BarChart3, Send, Sparkles, Table2, Trophy, Users } from 'lucide-react';
import { OverTimeChart } from '../components/analytics/OverTimeChart';
import { SourceBreakdown } from '../components/analytics/SourceBreakdown';
import { LoadErrorAlert } from '../components/applications/LoadErrorAlert';
import { StatCard, StatCardSkeleton } from '../components/dashboard/StatCard';
import { StatusBreakdown } from '../components/dashboard/StatusBreakdown';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, TextInput } from '../components/ui/Field';
import { Skeleton } from '../components/ui/Skeleton';
import { useAnalytics } from '../hooks/useApplicationData';
import { RANGE_PRESETS, formatBucket, formatPercent, getPresetRange } from '../utils/analytics';
import { parseISODate } from '../utils/date';
import { cn, pluralize } from '../utils/format';

const DEFAULT_PRESET = '90d';

/** Range from the URL: a preset (?range=30d) or custom dates (?from=…&to=…). */
function useAnalyticsRange() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [now] = useState(() => new Date());
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const custom = parseISODate(from) && parseISODate(to) && from <= to;
  const requested = searchParams.get('range');
  const preset = custom ? 'custom' : RANGE_PRESETS.some((item) => item.value === requested) ? requested : DEFAULT_PRESET;
  const range = custom ? { from, to } : getPresetRange(preset, now);

  function setPreset(value) {
    setSearchParams(value === DEFAULT_PRESET ? {} : { range: value }, { replace: true, preventScrollReset: true });
  }
  function setCustom(next) {
    setSearchParams({ from: next.from, to: next.to }, { replace: true, preventScrollReset: true });
  }
  return { preset, range, setPreset, setCustom };
}

function RangeControls({ preset, range, onPreset, onCustom }) {
  const [draft, setDraft] = useState(range);
  const invalid = draft.from && draft.to && draft.from > draft.to;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div role="group" aria-label="Date range" className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1">
        {RANGE_PRESETS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={preset === item.value}
            onClick={() => onPreset(item.value)}
            className={cn(
              'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              preset === item.value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.from && draft.to && !invalid) onCustom(draft);
        }}
      >
        <Field id="analytics-from" label="From" error={invalid ? 'Start is after end.' : undefined} className="w-40">
          {(aria) => (
            <TextInput {...aria} type="date" value={draft.from} onChange={(event) => setDraft((d) => ({ ...d, from: event.target.value }))} />
          )}
        </Field>
        <Field id="analytics-to" label="To" className="w-40">
          {(aria) => (
            <TextInput {...aria} type="date" value={draft.to} onChange={(event) => setDraft((d) => ({ ...d, to: event.target.value }))} />
          )}
        </Field>
        <Button type="submit" variant="secondary" disabled={!draft.from || !draft.to || invalid}>
          Apply
        </Button>
      </form>
    </div>
  );
}

function OverTimeCard({ analytics }) {
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();
  const unit = { week: 'week', month: 'month', year: 'year' }[analytics.granularity];

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader
        titleId={titleId}
        title="Applications over time"
        description={`Applications submitted per ${unit}, by applied date.`}
        action={
          <Button
            variant="ghost"
            size="sm"
            icon={showTable ? BarChart3 : Table2}
            aria-pressed={showTable}
            onClick={() => setShowTable((value) => !value)}
            className="-mr-2"
          >
            {showTable ? 'Show chart' : 'Show table'}
          </Button>
        }
      />
      <div className="px-2 py-4 sm:px-4">
        {showTable ? (
          <div className="max-h-72 overflow-y-auto px-2">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Applications submitted per {unit}</caption>
              <thead className="text-xs text-slate-500 uppercase">
                <tr>
                  <th scope="col" className="py-2 font-medium">
                    Period
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Applications
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.overTime.map((bucket) => (
                  <tr key={bucket.start}>
                    <th scope="row" className="py-2 font-normal text-slate-700">
                      {formatBucket(bucket.start, analytics.granularity)}
                    </th>
                    <td className="py-2 text-right text-slate-900 tabular-nums">{bucket.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Decorative for screen readers; the table view carries the same numbers.
          <div aria-hidden="true">
            <OverTimeChart data={analytics.overTime} granularity={analytics.granularity} />
          </div>
        )}
      </div>
    </Card>
  );
}

const DEFINITIONS = [
  ['Submitted', 'Applications with an applied date in the selected range. Saved jobs you haven’t applied to are not included.'],
  ['Response rate', 'Submitted applications now at Assessment, Interview, Offer or Rejected, divided by Submitted.'],
  ['Interview rate', 'Submitted applications now at Interview or Offer, divided by Submitted.'],
  ['Offer rate', 'Submitted applications now at Offer, divided by Submitted.'],
];

export default function AnalyticsPage() {
  const { preset, range, setPreset, setCustom } = useAnalyticsRange();
  const query = useAnalytics(range);
  const analytics = query.data;
  const loading = query.isPending;

  let body;
  if (query.isError && !analytics) {
    body = <LoadErrorAlert error={query.error} onRetry={() => query.refetch()} title="We couldn’t load your analytics" />;
  } else if (!loading && analytics.totals.submitted === 0) {
    body = (
      <Card>
        <EmptyState
          icon={BarChart3}
          title="No applications submitted in this period"
          description="Analytics count applications with an applied date. Pick a longer range, or add applications to get started."
          className="py-16"
        />
      </Card>
    );
  } else {
    const totals = analytics?.totals;
    const cards = [
      {
        label: 'Submitted',
        value: totals?.submitted,
        footnote: 'Applications with an applied date',
        icon: Send,
        tone: 'brand',
      },
      {
        label: 'Response rate',
        value: formatPercent(analytics?.rates.response),
        footnote: `${totals?.responded} of ${pluralize(totals?.submitted ?? 0, 'application')} got a response`,
        icon: Users,
        tone: 'violet',
      },
      {
        label: 'Interview rate',
        value: formatPercent(analytics?.rates.interview),
        footnote: `${totals?.reachedInterview} reached interview or offer`,
        icon: Sparkles,
        tone: 'violet',
      },
      {
        label: 'Offer rate',
        value: formatPercent(analytics?.rates.offer),
        footnote: `${pluralize(totals?.offers ?? 0, 'offer')} received`,
        icon: Trophy,
        tone: 'success',
      },
    ];

    body = (
      <div className={cn('space-y-6', query.isPlaceholderData && 'opacity-60 transition-opacity')}>
        <section aria-label="Key rates" aria-busy={loading}>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {cards.map((card) => (loading ? <StatCardSkeleton key={card.label} /> : <StatCard key={card.label} {...card} />))}
          </div>
        </section>

        {loading ? (
          <Skeleton className="h-80 rounded-xl" />
        ) : (
          <>
            <OverTimeCard analytics={analytics} />
            <div className="grid gap-6 lg:grid-cols-2">
              <StatusBreakdown byStatus={analytics.byStatus} total={analytics.totals.submitted} />
              <Card aria-labelledby="by-source-title">
                <CardHeader titleId="by-source-title" title="Where you found them" description="Submitted applications by source." />
                <div className="px-4 py-5 sm:px-5">
                  <SourceBreakdown bySource={analytics.bySource} total={analytics.totals.submitted} />
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Keyed by range so the custom date inputs reset when a preset is chosen. */}
      <RangeControls key={`${range.from}|${range.to}`} preset={preset} range={range} onPreset={setPreset} onCustom={setCustom} />
      {body}
      <Card aria-labelledby="definitions-title">
        <CardHeader
          titleId="definitions-title"
          title="How these numbers are calculated"
          description="Only your own applications are counted. Rates use each application’s current status, so one rejected after an interview counts as Rejected."
        />
        <dl className="grid gap-x-6 gap-y-4 px-4 py-5 sm:grid-cols-2 sm:px-5">
          {DEFINITIONS.map(([term, definition]) => (
            <div key={term}>
              <dt className="text-sm font-medium text-slate-900">{term}</dt>
              <dd className="mt-0.5 text-sm text-slate-600">{definition}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
