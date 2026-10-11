import { useEffect, useRef } from 'react';
import { addDays, toISODate } from '../../utils/date';
import { cn } from '../../utils/format';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const KEY_STEPS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

/**
 * Month grid (weeks start on Monday). Days are buttons; arrow keys move between
 * days (crossing into other months), Home/End jump to the start/end of the week.
 * Only the selected day is in the tab order (roving tabindex).
 */
export function MonthCalendar({ weeks, month, selectedDay, today, eventsByDay, onSelectDay, moveFocusRef }) {
  const buttonsRef = useRef(new Map());

  // After keyboard navigation, move focus to the newly selected day.
  useEffect(() => {
    if (!moveFocusRef.current) return;
    moveFocusRef.current = false;
    buttonsRef.current.get(selectedDay)?.focus();
  }, [selectedDay, weeks, moveFocusRef]);

  function handleKeyDown(event, date) {
    let next = null;
    if (event.key in KEY_STEPS) next = addDays(date, KEY_STEPS[event.key]);
    else if (event.key === 'Home') next = addDays(date, -((date.getDay() + 6) % 7));
    else if (event.key === 'End') next = addDays(date, 6 - ((date.getDay() + 6) % 7));
    if (!next) return;
    event.preventDefault();
    moveFocusRef.current = true;
    onSelectDay(next);
  }

  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month);
  const fullDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <table className="w-full table-fixed border-collapse">
      <caption className="sr-only">{monthLabel}</caption>
      <thead>
        <tr>
          {WEEKDAYS.map((day) => (
            <th key={day} scope="col" className="pb-2 text-xs font-medium text-slate-500">
              {day}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={toISODate(week[0])}>
            {week.map((date) => {
              const key = toISODate(date);
              const events = eventsByDay.get(key) ?? [];
              const inMonth = date.getMonth() === month.getMonth();
              const selected = key === selectedDay;
              const isToday = key === today;
              const interviews = events.filter((event) => event.type === 'interview').length;
              const deadlines = events.length - interviews;
              const summary = [
                interviews && `${interviews} interview${interviews === 1 ? '' : 's'}`,
                deadlines && `${deadlines} deadline${deadlines === 1 ? '' : 's'}`,
              ]
                .filter(Boolean)
                .join(', ');

              return (
                <td key={key} className="p-0.5 align-top">
                  <button
                    ref={(node) => {
                      if (node) buttonsRef.current.set(key, node);
                      else buttonsRef.current.delete(key);
                    }}
                    type="button"
                    tabIndex={selected ? 0 : -1}
                    aria-pressed={selected}
                    aria-current={isToday ? 'date' : undefined}
                    aria-label={`${fullDate.format(date)}${summary ? `, ${summary}` : ', no events'}`}
                    onClick={() => onSelectDay(date)}
                    onKeyDown={(event) => handleKeyDown(event, date)}
                    className={cn(
                      'flex h-14 w-full cursor-pointer flex-col items-center gap-1 rounded-lg pt-1.5 text-sm transition-colors sm:h-20',
                      selected ? 'bg-brand-600 text-white' : 'hover:bg-slate-100',
                      !selected &&
                        (isToday
                          ? 'font-semibold text-brand-700 ring-1 ring-brand-300 ring-inset'
                          : inMonth
                            ? 'font-medium text-slate-900'
                            : 'text-slate-600'),
                    )}
                  >
                    <span aria-hidden="true">{date.getDate()}</span>
                    {events.length > 0 && (
                      <span className="flex items-center gap-1" aria-hidden="true">
                        {interviews > 0 && (
                          <span className={cn('size-1.5 rounded-full', selected ? 'bg-white' : 'bg-violet-500')} />
                        )}
                        {deadlines > 0 && (
                          <span className={cn('size-1.5 rounded-full', selected ? 'bg-white' : 'bg-amber-500')} />
                        )}
                        {events.length > 1 && (
                          <span className={cn('text-[10px] leading-none', selected ? 'text-white' : 'text-slate-500')}>
                            {events.length}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
