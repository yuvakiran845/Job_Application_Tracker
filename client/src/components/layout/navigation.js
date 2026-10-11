import { BriefcaseBusiness, CalendarDays, ChartColumn, LayoutDashboard, SquareKanban } from 'lucide-react';

export const PRIMARY_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/applications', label: 'Applications', icon: BriefcaseBusiness },
];

// Shown disabled with a "Soon" label so the roadmap is visible without
// presenting links that lead nowhere.
export const UPCOMING_NAV = [
  { label: 'Pipeline', icon: SquareKanban },
  { label: 'Calendar', icon: CalendarDays },
  { label: 'Analytics', icon: ChartColumn },
];
