import { useEffect } from 'react';
import { FilterX, Inbox, LoaderCircle, Plus, SearchX } from 'lucide-react';
import { ApplicationFilters } from '../components/applications/ApplicationFilters';
import { ApplicationsTable, ApplicationsTableSkeleton } from '../components/applications/ApplicationsTable';
import { LoadErrorAlert } from '../components/applications/LoadErrorAlert';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { useApplicationActions } from '../hooks/useApplicationActions';
import { useApplicationList, useApplicationStats } from '../hooks/useApplicationData';
import { useApplicationQuery } from '../hooks/useApplicationQuery';
import { PAGE_SIZES, countActiveFilters, getPageRange } from '../utils/applicationQuery';
import { pluralize } from '../utils/format';

export default function ApplicationsPage() {
  const { openAdd } = useApplicationActions();
  const { query, updateQuery, clearFilters } = useApplicationQuery();
  // Search, filters, sorting and pagination run on the server (GET /api/applications).
  const listQuery = useApplicationList(query);
  // The overall total (without filters) comes from the dashboard stats.
  const statsQuery = useApplicationStats();
  const activeFilterCount = countActiveFilters(query);

  const result = listQuery.data;
  const overallTotal = statsQuery.data?.total;
  const pageCount = result?.meta.pageCount;
  const pagePastEnd = Boolean(result && result.items.length === 0 && result.meta.total > 0 && query.page > pageCount);

  // A page that no longer exists (e.g. after deleting the last item on it): go to the last page.
  useEffect(() => {
    if (pagePastEnd) updateQuery({ page: pageCount });
  }, [pagePastEnd, pageCount, updateQuery]);

  if (listQuery.isError && !result) {
    return <LoadErrorAlert error={listQuery.error} onRetry={() => listQuery.refetch()} />;
  }

  const loading = listQuery.isPending;
  const matching = result?.meta.total ?? 0;
  const hasNoApplications = !loading && activeFilterCount === 0 && matching === 0;

  let summary = 'Loading applications…';
  if (!loading) {
    // The overall total comes from a separate request; never show it if it's behind the list.
    const totalKnown = overallTotal !== undefined && overallTotal >= matching;
    summary =
      activeFilterCount > 0
        ? totalKnown
          ? `${matching} of ${pluralize(overallTotal, 'application')} match your filters.`
          : `${pluralize(matching, 'application')} match your filters.`
        : `${pluralize(matching, 'application')} in total.`;
  }

  let content;
  if (loading || pagePastEnd) {
    content = <ApplicationsTableSkeleton rows={8} />;
  } else if (hasNoApplications) {
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
  } else if (matching === 0) {
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
        {listQuery.isError && (
          <LoadErrorAlert
            error={listQuery.error}
            onRetry={() => listQuery.refetch()}
            title="Showing earlier results — the latest couldn’t be loaded"
            className="m-4 sm:m-5"
          />
        )}
        {/* Previous results stay visible (dimmed) while the next page or filter loads. */}
        <div className={listQuery.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <ApplicationsTable
            applications={result.items}
            caption="All applications"
            sort={{ field: query.sort, order: query.order }}
            onSortChange={updateQuery}
            showDeadline
          />
        </div>
        <Pagination
          page={result.meta.page}
          pageCount={result.meta.pageCount}
          pageSize={result.meta.pageSize}
          pageSizes={PAGE_SIZES}
          {...getPageRange(result.meta, result.items.length)}
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
        description={
          <span className="inline-flex items-center gap-2" aria-live="polite">
            {summary}
            {listQuery.isFetching && !loading && (
              <>
                <LoaderCircle className="size-3.5 animate-spin text-slate-400" aria-hidden="true" />
                <span className="sr-only">Updating</span>
              </>
            )}
          </span>
        }
        action={
          activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" icon={FilterX} onClick={clearFilters} className="-mr-2">
              Clear filters
            </Button>
          )
        }
      />
      {!hasNoApplications && (
        <ApplicationFilters query={query} onChange={updateQuery} activeFilterCount={activeFilterCount} />
      )}
      {content}
    </Card>
  );
}
