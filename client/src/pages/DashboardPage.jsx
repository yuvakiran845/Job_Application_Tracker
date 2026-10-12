import { useMemo, useState } from 'react';
import { CalendarDays, ChartColumn, ChartPie, CircleCheck, FileText } from 'lucide-react';
import { LoadErrorAlert } from '../components/applications/LoadErrorAlert';
import { RecentApplications, UpcomingDeadlines, UpcomingInterviews } from '../components/dashboard/DashboardLists';
import { StatCard, StatCardSkeleton } from '../components/dashboard/StatCard';
import { StatusBreakdown } from '../components/dashboard/StatusBreakdown';
import { useApplicationActions } from '../hooks/useApplicationActions';
import { useAnalytics, useApplicationStats, useEvents, useRecentApplications } from '../hooks/useApplicationData';
import { formatPercent } from '../utils/analytics';
import { isUpcomingEvent, sortEvents, toEventRange } from '../utils/calendar';
import { addDays, toISODate } from '../utils/date';
import { pluralize } from '../utils/format';

const RECENT_LIMIT = 4;
const LIST_LIMIT = 4;
const UPCOMING_DAYS = 30;
// Same definitions as the Analytics page, over all time.
const ALL_TIME = { from: '', to: '' };

export default function DashboardPage() {
  const { openAdd } = useApplicationActions();
  const statsQuery = useApplicationStats();
  const analyticsQuery = useAnalytics(ALL_TIME);
  const recentQuery = useRecentApplications(RECENT_LIMIT);

  const [now] = useState(() => new Date());
  const today = toISODate(now);
  const eventRange = useMemo(() => toEventRange(now, addDays(now, UPCOMING_DAYS - 1)), [now]);
  const eventsQuery = useEvents(eventRange);
  const { interviews, deadlines } = useMemo(() => {
    const upcoming = sortEvents((eventsQuery.data ?? []).filter((event) => isUpcomingEvent(event, today)));
    return {
      interviews: upcoming.filter((event) => event.type === 'interview'),
      deadlines: upcoming.filter((event) => event.type === 'deadline'),
    };
  }, [eventsQuery.data, today]);

  const stats = statsQuery.data;
  const analytics = analyticsQuery.data;
  const loading = statsQuery.isPending || analyticsQuery.isPending;
  const addedThisWeek = stats?.appliedSince.count ?? 0;

  const statCards = [
    {
      label: 'Applications',
      value: stats?.total,
      footnote: addedThisWeek > 0 ? `+${addedThisWeek} applied this week` : 'None applied this week',
      trend: addedThisWeek > 0 ? 'up' : undefined,
      icon: FileText,
      tone: 'brand',
    },
    {
      label: 'Interviews',
      value: stats?.interviews,
      footnote: eventsQuery.isSuccess ? (interviews.length > 0 ? `${interviews.length} upcoming` : 'None scheduled') : '',
      icon: CalendarDays,
      tone: 'brand',
    },
    { label: 'Offers', value: stats?.offers, footnote: 'Offers received', icon: CircleCheck, tone: 'success' },
    {
      label: 'Response rate',
      value: analyticsQuery.isError ? '—' : formatPercent(analytics?.rates.response),
      footnote: analyticsQuery.isError
        ? 'Unavailable right now'
        : analytics?.totals.submitted
          ? `${analytics.totals.responded} of ${pluralize(analytics.totals.submitted, 'application')}`
          : 'No applications sent yet',
      icon: ChartColumn,
      tone: 'violet',
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {statsQuery.isError ? (
        <LoadErrorAlert
          error={statsQuery.error}
          onRetry={() => statsQuery.refetch()}
          title="We couldn’t load your dashboard"
        />
      ) : (
        <section aria-label="Key metrics" aria-busy={loading}>
          <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4">
            {loading
              ? statCards.map((card) => <StatCardSkeleton key={card.label} />)
              : statCards.map((card) => <StatCard key={card.label} {...card} />)}
          </div>
        </section>
      )}

      {/* Two independent columns, so a short card never leaves a gap beside a tall one.
          On phones: interviews, deadlines, recent applications, then the breakdown. */}
      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="min-w-0 space-y-6 lg:space-y-8">
          <UpcomingInterviews
            query={eventsQuery}
            events={interviews.slice(0, LIST_LIMIT)}
            today={today}
            days={UPCOMING_DAYS}
          />
          <UpcomingDeadlines query={eventsQuery} events={deadlines.slice(0, LIST_LIMIT)} today={today} days={UPCOMING_DAYS} />
        </div>
        <div className="min-w-0 space-y-6 lg:space-y-8">
          <RecentApplications query={recentQuery} onAdd={openAdd} />
          {!statsQuery.isError && (
            <StatusBreakdown
              byStatus={stats?.byStatus}
              total={stats?.total ?? 0}
              loading={statsQuery.isPending}
              icon={ChartPie}
              iconTone="violet"
            />
          )}
        </div>
      </div>
    </div>
  );
}
