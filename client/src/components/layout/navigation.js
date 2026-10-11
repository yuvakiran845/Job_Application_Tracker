import {
  BriefcaseBusiness,
  CalendarDays,
  ChartColumn,
  LayoutDashboard,
  SquareKanban,
} from 'lucide-react';

export const PRIMARY_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/applications', label: 'Applications', icon: BriefcaseBusiness },
  { to: '/pipeline', label: 'Pipeline', icon: SquareKanban },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
];
