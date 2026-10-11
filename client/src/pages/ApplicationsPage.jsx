import { useMemo } from 'react';
import { useOutletContext } from 'react-router';
import { Inbox, Plus } from 'lucide-react';
import { ApplicationsTable, ApplicationsTableSkeleton } from '../components/applications/ApplicationsTable';
import { LoadErrorAlert } from '../components/applications/LoadErrorAlert';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useApplications } from '../hooks/useApplications';
import { pluralize } from '../utils/format';
import { sortByNewest } from '../utils/stats';

export default function ApplicationsPage() {
  const { openAddApplication } = useOutletContext();
  const { applications, status, reload } = useApplications();
  const sortedApplications = useMemo(() => sortByNewest(applications), [applications]);

  if (status === 'error') return <LoadErrorAlert onRetry={reload} />;

  const loading = status === 'loading';

  return (
    <Card aria-labelledby="all-applications-title">
      <CardHeader
        titleId="all-applications-title"
        title="All applications"
        description={loading ? 'Loading applications…' : `${pluralize(applications.length, 'application')}, newest first.`}
      />
      {loading ? (
        <ApplicationsTableSkeleton rows={8} />
      ) : sortedApplications.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No applications yet"
          description="Every role you add appears here so you can follow it from application to offer."
          action={
            <Button icon={Plus} onClick={openAddApplication}>
              Add application
            </Button>
          }
        />
      ) : (
        <ApplicationsTable applications={sortedApplications} caption="All applications" />
      )}
    </Card>
  );
}
