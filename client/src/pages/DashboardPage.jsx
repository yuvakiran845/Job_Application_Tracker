import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CircleX, Inbox, MessagesSquare, Plus, Trophy } from 'lucide-react';
import { ApplicationsTable, ApplicationsTableSkeleton } from '../components/applications/ApplicationsTable';
import { LoadErrorAlert } from '../components/applications/LoadErrorAlert';
import { StatCard, StatCardSkeleton } from '../components/dashboard/StatCard';
import { StatusBreakdown } from '../components/dashboard/StatusBreakdown';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useApplicationActions } from '../hooks/useApplicationActions';
import { useApplicationStats, useRecentApplications } from '../hooks/useApplicationData';
import { useAuth } from '../hooks/useAuth';
import { formatLongDate, getGreeting } from '../utils/date';
import { pluralize } from '../utils/format';
import { RECENT_WINDOW_DAYS } from '../utils/stats';

const RECENT_LIMIT = 5;

function getFirstName(user) {
  return user?.name?.trim().split(/\s+/)[0] ?? '';
}

export default function DashboardPage() {
  const { openAdd } = useApplicationActions();
  const { user, enabled: authEnabled } = useAuth();
  const statsQuery = useApplicationStats();
  const recentQuery = useRecentApplications(RECENT_LIMIT);
  const [now] = useState(() => new Date());

  const stats = statsQuery.data;
  const loading = statsQuery.isPending;
  const firstName = authEnabled ? getFirstName(user) : '';

  const statCards = [
    {
      label: 'Total applications',
      value: stats?.total,
      footnote: `${pluralize(stats?.appliedSince.count ?? 0, 'application')} sent in the last ${RECENT_WINDOW_DAYS} days`,
      icon: BriefcaseBusiness,
      tone: 'brand',
    },
    {
      label: 'Interviews',
      value: stats?.interviews,
      footnote: 'Currently at the interview stage',
      icon: MessagesSquare,
      tone: 'violet',
    },
    { label: 'Offers', value: stats?.offers, footnote: 'Offers received', icon: Trophy, tone: 'success' },
    {
      label: 'Rejections',
      value: stats?.rejections,
      footnote: 'Closed by the employer',
      icon: CircleX,
      tone: 'danger',
    },
  ];

  let recentContent;
  if (recentQuery.isPending) {
    recentContent = <ApplicationsTableSkeleton rows={RECENT_LIMIT} />;
  } else if (recentQuery.isError) {
    recentContent = (
      <LoadErrorAlert error={recentQuery.error} onRetry={() => recentQuery.refetch()} className="m-4 sm:m-5" />
    );
  } else if (recentQuery.data.items.length === 0) {
    recentContent = (
      <EmptyState
        icon={Inbox}
        title="No applications yet"
        description="Add the first role you’ve applied to and CareerFlow will start tracking your progress."
        action={
          <Button icon={Plus} onClick={openAdd}>
            Add application
          </Button>
        }
      />
    );
  } else {
    recentContent = <ApplicationsTable applications={recentQuery.data.items} caption="Recently added applications" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">{formatLongDate(now)}</p>
        <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900">
          {getGreeting(now)}
          {firstName && `, ${firstName}`}
        </h2>
        <p className="mt-1 text-sm text-slate-600">Here’s where your job search stands today.</p>
      </div>

      {statsQuery.isError ? (
        <LoadErrorAlert
          error={statsQuery.error}
          onRetry={() => statsQuery.refetch()}
          title="We couldn’t load your dashboard"
        />
      ) : (
        <>
          <section aria-label="Key metrics" aria-busy={loading}>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {loading
                ? statCards.map((card) => <StatCardSkeleton key={card.label} />)
                : statCards.map((card) => <StatCard key={card.label} {...card} />)}
            </div>
          </section>

          <StatusBreakdown byStatus={stats?.byStatus} total={stats?.total ?? 0} loading={loading} />
        </>
      )}

      <Card aria-labelledby="recent-applications-title">
        <CardHeader
          titleId="recent-applications-title"
          title="Recently added"
          description="Your newest applications, most recent first."
          action={
            <ButtonLink to="/applications" variant="ghost" size="sm" className="-mr-2">
              View all
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          }
        />
        {recentContent}
      </Card>
    </div>
  );
}
