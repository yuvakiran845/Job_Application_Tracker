import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ArrowDown, ArrowUp, ChevronsUpDown, MapPin } from 'lucide-react';
import { EMPLOYMENT_TYPES, STATUS_BY_VALUE, getOptionLabel } from '../../constants/applications';
import { DEFAULT_SORT_ORDER } from '../../utils/applicationQuery';
import { describeDueDate, formatDate, todayISO } from '../../utils/date';
import { cn } from '../../utils/format';
import { Skeleton } from '../ui/Skeleton';
import { ApplicationActionsMenu } from './ApplicationActionsMenu';
import { CompanyAvatar } from './CompanyAvatar';
import { StatusSelect } from './StatusSelect';

function AppliedDate({ value }) {
  if (!value) return <span className="text-slate-500">Not applied yet</span>;
  return <time dateTime={value}>{formatDate(value)}</time>;
}

function Deadline({ application, today }) {
  if (!application.deadline) {
    return (
      <>
        <span className="text-slate-400" aria-hidden="true">
          —
        </span>
        <span className="sr-only">No deadline</span>
      </>
    );
  }
  const hint = STATUS_BY_VALUE[application.status]?.isOpen ? describeDueDate(application.deadline, today) : '';
  return (
    <>
      <time dateTime={application.deadline} className="block">
        {formatDate(application.deadline)}
      </time>
      {hint && (
        <span className={cn('text-xs', hint === 'Passed' ? 'text-slate-500' : 'font-medium text-amber-700')}>
          {hint}
        </span>
      )}
    </>
  );
}

function DetailsLink({ application, className, children }) {
  const location = useLocation();
  return (
    <Link
      to={`/applications/${application.id}`}
      state={{ returnTo: `${location.pathname}${location.search}` }}
      className={cn('rounded-sm hover:text-brand-700 hover:underline', className)}
    >
      {children}
    </Link>
  );
}

function SortableHeader({ field, label, sort, onSortChange, className }) {
  const active = sort?.field === field;
  const ariaSort = active ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined;

  if (!onSortChange) {
    return (
      <th scope="col" className={cn('px-3 py-3 font-medium', className)}>
        {label}
      </th>
    );
  }

  const Icon = !active ? ChevronsUpDown : sort.order === 'asc' ? ArrowUp : ArrowDown;
  const nextOrder = active ? (sort.order === 'asc' ? 'desc' : 'asc') : DEFAULT_SORT_ORDER[field];

  return (
    <th scope="col" aria-sort={ariaSort} className={cn('px-3 py-2 font-medium', className)}>
      <button
        type="button"
        onClick={() => onSortChange({ sort: field, order: nextOrder })}
        className={cn(
          '-mx-1.5 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 tracking-wide uppercase hover:bg-slate-100 hover:text-slate-800',
          active && 'text-slate-800',
        )}
      >
        {label}
        <Icon className={cn('size-3.5', !active && 'opacity-50')} aria-hidden="true" />
      </button>
    </th>
  );
}

/**
 * Applications list: a table from the `md` breakpoint up, stacked cards below it.
 * Pass `sort` and `onSortChange` to make column headers sortable.
 */
export function ApplicationsTable({ applications, caption, sort, onSortChange, showDeadline = false }) {
  const [today] = useState(() => todayISO());
  const headerProps = { sort, onSortChange };

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-slate-200 bg-slate-50/80 text-xs tracking-wide text-slate-500 uppercase">
            <tr>
              <SortableHeader field="company" label="Company" className="pl-5" {...headerProps} />
              <th scope="col" className="px-3 py-3 font-medium">
                Job title
              </th>
              <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">
                Location
              </th>
              <SortableHeader field="appliedDate" label="Applied" className="whitespace-nowrap" {...headerProps} />
              {showDeadline && (
                <SortableHeader field="deadline" label="Deadline" className="hidden xl:table-cell" {...headerProps} />
              )}
              <SortableHeader field="status" label="Status" {...headerProps} />
              <th scope="col" className="py-3 pr-5 pl-3 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.map((application) => (
              <tr key={application.id} className="transition-colors hover:bg-slate-50/70">
                <th scope="row" className="py-3 pr-3 pl-5 font-normal">
                  <div className="flex items-center gap-3">
                    <CompanyAvatar name={application.company} />
                    <DetailsLink application={application} className="font-medium text-slate-900">
                      {application.company}
                    </DetailsLink>
                  </div>
                </th>
                <td className="px-3 py-3">
                  <p className="text-slate-800">{application.jobTitle}</p>
                  {application.employmentType && (
                    <p className="text-xs text-slate-500">
                      {getOptionLabel(EMPLOYMENT_TYPES, application.employmentType)}
                    </p>
                  )}
                </td>
                <td className="hidden px-3 py-3 text-slate-600 lg:table-cell">{application.location}</td>
                <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                  <AppliedDate value={application.appliedDate} />
                </td>
                {showDeadline && (
                  <td className="hidden px-3 py-3 whitespace-nowrap text-slate-600 xl:table-cell">
                    <Deadline application={application} today={today} />
                  </td>
                )}
                <td className="px-3 py-3">
                  <StatusSelect application={application} />
                </td>
                <td className="py-3 pr-5 pl-3 text-right">
                  <ApplicationActionsMenu application={application} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden" aria-label={caption}>
        {applications.map((application) => (
          <li key={application.id} className="flex gap-3 py-4 pr-2 pl-4">
            <CompanyAvatar name={application.company} />
            <div className="min-w-0 flex-1">
              <DetailsLink application={application} className="block truncate font-medium text-slate-900">
                {application.company}
              </DetailsLink>
              <p className="truncate text-sm text-slate-700">{application.jobTitle}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {application.location}
                </span>
                <span>
                  {application.appliedDate ? 'Applied ' : ''}
                  <AppliedDate value={application.appliedDate} />
                </span>
              </div>
              <StatusSelect application={application} className="mt-2.5" />
            </div>
            <ApplicationActionsMenu application={application} />
          </li>
        ))}
      </ul>
    </>
  );
}

export function ApplicationsTableSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-slate-100" role="status" aria-label="Loading applications">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden h-3.5 w-24 md:block" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
