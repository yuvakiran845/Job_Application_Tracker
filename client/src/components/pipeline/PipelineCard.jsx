import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarClock, GripVertical } from 'lucide-react';
import { STATUS_BY_VALUE } from '../../constants/applications';
import { describeDueDate, formatDate, formatDateTime, todayISO } from '../../utils/date';
import { cn } from '../../utils/format';
import { StatusSelect } from '../applications/StatusSelect';

function CardMeta({ application, now }) {
  const isOpen = STATUS_BY_VALUE[application.status]?.isOpen;
  if (isOpen && application.interviewDate && application.interviewDate >= now.instant) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-violet-700">
        <CalendarClock className="size-3.5" aria-hidden="true" />
        Interview {formatDateTime(application.interviewDate)}
      </span>
    );
  }
  const dueHint = isOpen ? describeDueDate(application.deadline, now.today) : '';
  if (dueHint && dueHint !== 'Passed') {
    return <span className="font-medium text-amber-700">Due {formatDate(application.deadline)} · {dueHint}</span>;
  }
  return application.appliedDate ? <span>Applied {formatDate(application.appliedDate)}</span> : <span>Not applied yet</span>;
}

/** A draggable application card. The status select is the keyboard/touch alternative to dragging. */
export function PipelineCard({ application, dragging, onDragStart, onDragEnd }) {
  const [now] = useState(() => ({ today: todayISO(), instant: new Date().toISOString() }));
  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', application.id);
        onDragStart(application);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'group cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-xs transition-[opacity,box-shadow] hover:shadow-sm active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Link
            to={`/applications/${application.id}`}
            state={{ returnTo: '/pipeline' }}
            className="block truncate text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline"
          >
            {application.company}
          </Link>
          <p className="truncate text-sm text-slate-600">{application.jobTitle}</p>
        </div>
        <GripVertical className="mt-0.5 size-4 shrink-0 text-slate-300 group-hover:text-slate-400" aria-hidden="true" />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        <CardMeta application={application} now={now} />
      </p>
      <StatusSelect application={application} className="mt-2.5" />
    </li>
  );
}
