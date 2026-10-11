import { useCallback, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { APPLICATION_STATUSES } from '../../constants/applications';
import { useDebouncedInput } from '../../hooks/useDebouncedInput';
import { SORT_OPTIONS } from '../../utils/applicationQuery';
import { cn } from '../../utils/format';
import { Button } from '../ui/Button';
import { Field, Select, TextInput } from '../ui/Field';

const FILTER_PANEL_ID = 'application-filter-panel';

/** Search, filter and sort controls for the applications list. */
export function ApplicationFilters({ query, onChange, activeFilterCount }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const commitSearch = useCallback((q) => onChange({ q }), [onChange]);
  const commitLocation = useCallback((location) => onChange({ location }), [onChange]);
  const [search, setSearch] = useDebouncedInput(query.q, commitSearch);
  const [location, setLocation] = useDebouncedInput(query.location, commitLocation);
  const panelFilterCount = activeFilterCount - (query.q ? 1 : 0);
  const invalidRange = query.from && query.to && query.from > query.to;

  return (
    <div className="space-y-3 border-b border-slate-100 px-4 py-4 sm:px-5">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="application-search" className="sr-only">
            Search by company or job title
          </label>
          <TextInput
            id="application-search"
            type="search"
            icon={Search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search company or job title"
            autoComplete="off"
          />
        </div>
        <Button
          variant="secondary"
          icon={SlidersHorizontal}
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          aria-controls={FILTER_PANEL_ID}
          className="md:hidden"
        >
          Filters
          {panelFilterCount > 0 && (
            <span className="rounded-full bg-brand-600 px-1.5 text-xs leading-5 font-semibold text-white">
              {panelFilterCount}
            </span>
          )}
        </Button>
      </div>

      <div
        id={FILTER_PANEL_ID}
        className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-5', !panelOpen && 'max-md:hidden')}
      >
        <Field id="filter-status" label="Status">
          {(aria) => (
            <Select
              {...aria}
              value={query.status}
              onChange={(event) => onChange({ status: event.target.value })}
              options={APPLICATION_STATUSES}
              placeholder="All statuses"
            />
          )}
        </Field>
        <Field id="filter-location" label="Location">
          {(aria) => (
            <TextInput
              {...aria}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Any location"
              autoComplete="off"
            />
          )}
        </Field>
        <Field id="filter-from" label="Applied from" error={invalidRange ? 'Start date is after end date.' : undefined}>
          {(aria) => (
            <TextInput
              {...aria}
              type="date"
              value={query.from}
              max={query.to || undefined}
              onChange={(event) => onChange({ from: event.target.value })}
            />
          )}
        </Field>
        <Field id="filter-to" label="Applied to">
          {(aria) => (
            <TextInput
              {...aria}
              type="date"
              value={query.to}
              min={query.from || undefined}
              onChange={(event) => onChange({ to: event.target.value })}
            />
          )}
        </Field>
        <Field id="filter-sort" label="Sort by" className="sm:col-span-2 lg:col-span-1">
          {(aria) => (
            <Select
              {...aria}
              value={`${query.sort}:${query.order}`}
              onChange={(event) => {
                const [sort, order] = event.target.value.split(':');
                onChange({ sort, order });
              }}
              options={SORT_OPTIONS}
            />
          )}
        </Field>
      </div>
    </div>
  );
}
