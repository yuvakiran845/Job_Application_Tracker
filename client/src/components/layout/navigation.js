import { CalendarDays, ChartColumn, ClipboardList, House, SquareKanban } from 'lucide-react';

export const PRIMARY_NAV = [
  { to: '/', label: 'Dashboard', icon: House, end: true },
  { to: '/applications', label: 'My Applications', icon: ClipboardList },
  { to: '/pipeline', label: 'Pipeline', icon: SquareKanban },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
];
