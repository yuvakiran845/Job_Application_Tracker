import { ExternalLink, MapPin } from 'lucide-react';
import { EMPLOYMENT_TYPES, getOptionLabel } from '../../constants/applications';
import { formatDate } from '../../utils/date';
import { isHttpUrl } from '../../utils/validation';
import { buttonClasses } from '../ui/buttonStyles';
import { Skeleton } from '../ui/Skeleton';
import { CompanyAvatar } from './CompanyAvatar';
import { StatusBadge } from './StatusBadge';

function AppliedDate({ value }) {
  if (!value) return <span className="text-slate-500">Not applied yet</span>;
  return <time dateTime={value}>{formatDate(value)}</time>;
}

function JobPostingLink({ application, withLabel = false }) {
  const { jobUrl, jobTitle, company } = application;
  // Only render links that passed URL validation; never trust stored hrefs blindly.
  if (!jobUrl || !isHttpUrl(jobUrl)) {
    if (withLabel) return null;
    return (
      <span className="px-2 text-slate-400">
        <span aria-hidden="true">—</span>
        <span className="sr-only">No job posting link</span>
      </span>
    );
  }

  return (
    <a
      href={jobUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Open job posting"
      aria-label={`Open job posting for ${jobTitle} at ${company} (opens in a new tab)`}
      className={buttonClasses({
        variant: withLabel ? 'secondary' : 'ghost',
        size: 'sm',
        iconOnly: !withLabel,
      })}
    >
      <ExternalLink className="size-4" aria-hidden="true" />
      {withLabel && <span aria-hidden="true">Job posting</span>}
    </a>
  );
}

/**
 * Applications list: a table from the `md` breakpoint up, stacked cards below it.
 * Level 2 will add view/edit/delete/status actions to the Actions column.
 */
export function ApplicationsTable({ applications, caption }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th scope="col" className="py-3 pr-3 pl-5 font-medium">Company</th>
              <th scope="col" className="px-3 py-3 font-medium">Job title</th>
              <th scope="col" className="px-3 py-3 font-medium">Location</th>
              <th scope="col" className="px-3 py-3 font-medium whitespace-nowrap">Applied date</th>
              <th scope="col" className="px-3 py-3 font-medium">Status</th>
              <th scope="col" className="py-3 pr-5 pl-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.map((application) => (
              <tr key={application.id} className="transition-colors hover:bg-slate-50/70">
                <th scope="row" className="py-3 pr-3 pl-5 font-normal">
                  <div className="flex items-center gap-3">
                    <CompanyAvatar name={application.company} />
                    <span className="font-medium text-slate-900">{application.company}</span>
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
                <td className="px-3 py-3 text-slate-600">{application.location}</td>
                <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                  <AppliedDate value={application.appliedDate} />
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={application.status} />
                </td>
                <td className="py-3 pr-5 pl-3 text-right">
                  <JobPostingLink application={application} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden" aria-label={caption}>
        {applications.map((application) => (
          <li key={application.id} className="flex gap-3 px-4 py-4">
            <CompanyAvatar name={application.company} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-medium text-slate-900">{application.company}</p>
                <StatusBadge status={application.status} />
              </div>
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
              <div className="mt-3 empty:hidden">
                <JobPostingLink application={application} withLabel />
              </div>
            </div>
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
