import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, ExternalLink, FileQuestion, Mail, Pencil, Phone, Trash2 } from 'lucide-react';
import { CompanyAvatar } from '../components/applications/CompanyAvatar';
import { LoadErrorAlert } from '../components/applications/LoadErrorAlert';
import { StatusSelect } from '../components/applications/StatusSelect';
import { Button, ButtonLink } from '../components/ui/Button';
import { buttonClasses } from '../components/ui/buttonStyles';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { APPLICATION_SOURCES, EMPLOYMENT_TYPES, STATUS_BY_VALUE, getOptionLabel } from '../constants/applications';
import { useApplicationActions } from '../hooks/useApplicationActions';
import { useApplications } from '../hooks/useApplications';
import { describeDueDate, formatDate, formatDateTime, todayISO } from '../utils/date';
import { isHttpUrl } from '../utils/validation';

function NotSet() {
  return <span className="text-slate-500">Not set</span>;
}

function DetailItem({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm break-words text-slate-900">{children || <NotSet />}</dd>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="h-5 w-40" />
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex gap-4">
          <Skeleton className="size-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function ApplicationDetailsPage() {
  const { applicationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { applications, status, reload } = useApplications();
  const { openEdit, openDelete } = useApplicationActions();
  const [today] = useState(() => todayISO());

  // Return to the list view (with its filters) the user came from, if any.
  // Only same-app paths are accepted.
  const requestedReturn = location.state?.returnTo;
  const returnTo =
    typeof requestedReturn === 'string' && requestedReturn.startsWith('/') && !requestedReturn.startsWith('//')
      ? requestedReturn
      : '/applications';
  const backLink = (
    <Link
      to={returnTo}
      className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-slate-600 hover:text-slate-900"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to applications
    </Link>
  );

  if (status === 'error') return <LoadErrorAlert onRetry={reload} />;
  if (status === 'loading') return <DetailsSkeleton />;

  const application = applications.find((item) => item.id === applicationId);
  if (!application) {
    return (
      <Card>
        <EmptyState
          icon={FileQuestion}
          title="Application not found"
          description="It may have been deleted, or the link may be incorrect."
          action={<ButtonLink to="/applications">View all applications</ButtonLink>}
          className="py-16"
        />
      </Card>
    );
  }

  const isOpen = STATUS_BY_VALUE[application.status]?.isOpen;
  const deadlineHint = isOpen ? describeDueDate(application.deadline, today) : '';
  const { contact } = application;
  const hasContact = contact.name || contact.email || contact.phone;
  const jobUrlValid = application.jobUrl && isHttpUrl(application.jobUrl);

  return (
    <div className="space-y-6">
      {backLink}

      <Card as="div" className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <CompanyAvatar name={application.company} />
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight break-words text-slate-900">{application.jobTitle}</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {application.company} · {application.location}
              </p>
              <StatusSelect application={application} className="mt-3" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {jobUrlValid && (
              <a
                href={application.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: 'secondary' })}
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                Job posting
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
            <Button variant="secondary" icon={Pencil} onClick={() => openEdit(application)}>
              Edit
            </Button>
            <Button
              variant="secondary"
              icon={Trash2}
              className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              onClick={() => openDelete(application, { onDeleted: () => navigate(returnTo, { replace: true }) })}
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card aria-labelledby="details-title">
            <CardHeader titleId="details-title" title="Details" />
            <dl className="grid gap-x-6 gap-y-5 px-4 py-5 sm:grid-cols-2 sm:px-5">
              <DetailItem label="Employment type">
                {getOptionLabel(EMPLOYMENT_TYPES, application.employmentType)}
              </DetailItem>
              <DetailItem label="Salary range">{application.salaryRange}</DetailItem>
              <DetailItem label="Source">{getOptionLabel(APPLICATION_SOURCES, application.source)}</DetailItem>
              <DetailItem label="Applied date">
                {application.appliedDate && <time dateTime={application.appliedDate}>{formatDate(application.appliedDate)}</time>}
              </DetailItem>
              <DetailItem label="Deadline">
                {application.deadline && (
                  <>
                    <time dateTime={application.deadline}>{formatDate(application.deadline)}</time>
                    {deadlineHint && <span className="ml-2 text-xs font-medium text-amber-700">{deadlineHint}</span>}
                  </>
                )}
              </DetailItem>
              <DetailItem label="Interview">
                {application.interviewDate && (
                  <time dateTime={application.interviewDate}>{formatDateTime(application.interviewDate)}</time>
                )}
              </DetailItem>
              <div className="sm:col-span-2">
                <DetailItem label="Job posting">
                  {jobUrlValid && (
                    <a
                      href={application.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 hover:underline"
                    >
                      {application.jobUrl}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </DetailItem>
              </div>
            </dl>
          </Card>

          <Card aria-labelledby="notes-title">
            <CardHeader titleId="notes-title" title="Notes" />
            <div className="px-4 py-5 sm:px-5">
              {application.notes ? (
                <p className="text-sm whitespace-pre-wrap break-words text-slate-800">{application.notes}</p>
              ) : (
                <p className="text-sm text-slate-500">No notes yet. Use Edit to add interview prep or next steps.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card aria-labelledby="contact-title">
            <CardHeader titleId="contact-title" title="Recruiter or contact" />
            <div className="px-4 py-5 sm:px-5">
              {hasContact ? (
                <ul className="space-y-2.5 text-sm">
                  {contact.name && <li className="font-medium text-slate-900">{contact.name}</li>}
                  {contact.email && (
                    <li>
                      <a
                        href={`mailto:${contact.email}`}
                        className="inline-flex items-center gap-2 break-all text-brand-700 hover:underline"
                      >
                        <Mail className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                        {contact.email}
                      </a>
                    </li>
                  )}
                  {contact.phone && (
                    <li>
                      <a
                        href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
                        className="inline-flex items-center gap-2 text-brand-700 hover:underline"
                      >
                        <Phone className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                        {contact.phone}
                      </a>
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No contact details.</p>
              )}
            </div>
          </Card>

          <Card aria-labelledby="record-title">
            <CardHeader titleId="record-title" title="Record" />
            <dl className="space-y-4 px-4 py-5 sm:px-5">
              <DetailItem label="Added">
                <time dateTime={application.createdAt}>{formatDateTime(application.createdAt)}</time>
              </DetailItem>
              <DetailItem label="Last updated">
                <time dateTime={application.updatedAt}>{formatDateTime(application.updatedAt)}</time>
              </DetailItem>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
