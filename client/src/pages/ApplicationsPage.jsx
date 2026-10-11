import { useMemo } from 'react';
import { FilterX, Inbox, Plus, SearchX } from 'lucide-react';
import { ApplicationFilters } from '../components/applications/ApplicationFilters';
import { ApplicationsTable, ApplicationsTableSkeleton } from '../components/applications/ApplicationsTable';
import { LoadErrorAlert } from '../components/applications/LoadErrorAlert';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { useApplicationActions } from '../hooks/useApplicationActions';
import { useApplicationQuery } from '../hooks/useApplicationQuery';
import { useApplications } from '../hooks/useApplications';
import { PAGE_SIZES, countActiveFilters, queryApplications } from '../utils/applicationQuery';
import { pluralize } from '../utils/format';

export default function ApplicationsPage() {
  const { openAdd } = useApplicationActions();
  const { applications, status, reload } = useApplications();
  const { query, updateQuery, clearFilters } = useApplicationQuery();
  // Level 6: this becomes a request to GET /api/applications with the same query params.
  const result = useMemo(() => queryApplications(applications, query), [applications, query]);
  const activeFilterCount = countActiveFilters(query);

  if (status === 'error') return <LoadErrorAlert onRetry={reload} />;

  const loading = status === 'loading';
  let summary = 'Loading applications…';
  if (!loading) {
    summary =
      activeFilterCount > 0
        ? `${result.total} of ${pluralize(applications.length, 'application')} match your filters.`
        : `${pluralize(applications.length, 'application')} in total.`;
  }

  let content;
  if (loading) {
    content = <ApplicationsTableSkeleton rows={8} />;
  } else if (applications.length === 0) {
    content = (
      <EmptyState
        icon={Inbox}
        title="No applications yet"
        description="Every role you add appears here so you can follow it from application to offer."
        action={
          <Button icon={Plus} onClick={openAdd}>
            Add application
          </Button>
        }
      />
    );
  } else if (result.total === 0) {
    content = (
      <EmptyState
        icon={SearchX}
        title="No matching applications"
        description="Try a different search or remove some filters."
        action={
          <Button variant="secondary" icon={FilterX} onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  } else {
    content = (
      <>
        <ApplicationsTable
          applications={result.items}
          caption="All applications"
          sort={{ field: query.sort, order: query.order }}
          onSortChange={updateQuery}
          showDeadline
        />
        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          pageSize={result.pageSize}
          pageSizes={PAGE_SIZES}
          total={result.total}
          rangeStart={result.rangeStart}
          rangeEnd={result.rangeEnd}
          onPageChange={(page) => updateQuery({ page })}
          onPageSizeChange={(pageSize) => updateQuery({ pageSize })}
        />
      </>
    );
  }

  return (
    <Card aria-labelledby="all-applications-title">
      <CardHeader
        titleId="all-applications-title"
        title="All applications"
        description={<span aria-live="polite">{summary}</span>}
        action={
          activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" icon={FilterX} onClick={clearFilters} className="-mr-2">
              Clear filters
            </Button>
          )
        }
      />
      {applications.length > 0 && (
        <ApplicationFilters query={query} onChange={updateQuery} activeFilterCount={activeFilterCount} />
      )}
      {content}
    </Card>
  );
}
