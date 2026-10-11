# CareerFlow

CareerFlow is a job application tracker for students and job seekers. It keeps every application, interview, deadline, and recruitment update in one place.

> **Status: Level 1 of 9: frontend foundation.** The UI runs on development-only sample data held in memory. There is no backend, database, or authentication yet.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 4, lucide-react |
| Testing | Vitest 4, Testing Library, jsdom |
| Backend *(Level 3+)* | Node.js, Express, MongoDB Atlas, Mongoose, JWT, bcrypt |

## Getting started

**Requirements:** Node.js `^20.19.0` or `>=22.12.0`, npm 10+. Node 22 or 24 LTS is recommended; Node 20 is past end-of-life.

```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

| Command (in `client/`) | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `client/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint (including React Hooks rules) |
| `npm test` | Run unit and integration tests once |
| `npm run test:watch` | Run tests in watch mode |

## Project structure

```
client/
  src/
    components/
      ui/            Design system: Button, Badge, Card, Field inputs, Modal, Alert, Toaster, Skeleton, EmptyState
      layout/        Sidebar, mobile drawer, top bar, profile menu
      applications/  Applications table, Add Application form and modal, status badge
      dashboard/     Stat cards, status breakdown
    layouts/         AppLayout (shell around every page)
    pages/           Dashboard, Applications, Not found, route error
    context/         ApplicationsProvider (data state), ToastProvider
    hooks/           useApplications, useToast, useDialog, usePersistentState, usePageTitle
    services/        applicationService.js: the only data access point for the UI
    data/            sampleApplications.js: DEVELOPMENT-ONLY sample data
    constants/       Statuses, employment types, sources (mirror the future DB enums)
    utils/           Validation, stats, date helpers (+ tests)
server/              Added in Level 3
```

### Data flow

```
Pages/components → useApplications() → ApplicationsProvider → services/applicationService.js
                                                               └─ Level 1: in-memory mock seeded from data/sampleApplications.js
                                                               └─ Level 6: REST API calls (same function signatures)
```

Components never import sample data directly. The service functions are async and can throw a `ValidationError` with per-field errors, the same contract the API client will follow. Switching to the real backend therefore only changes `applicationService.js`.

### Design decisions

- **Dates** without a time (applied date, deadlines) are stored as `YYYY-MM-DD` strings and interpreted in local time, which avoids off-by-one-day timezone bugs.
- **The application model** already uses the final field names (`company`, `jobTitle`, `appliedDate`, `status`, `contact`, timestamps, …) so the Mongoose model in Level 4 matches.
- **Modals and the mobile drawer** use the native `<dialog>` element for focus trapping, Escape handling, and inert backgrounds. Focus returns to the trigger on close.
- **Client-side validation** exists for user experience only. The server will re-validate every request (Level 3).

## Design system

- **Colour:** slate neutrals plus a single indigo `brand` accent (defined in `src/index.css`). Status colours appear only in badges and small indicators (`src/components/ui/tones.js`).
- **Type:** Inter (self-hosted via `@fontsource-variable/inter`). Page title `text-lg`, section title `text-base`, body `text-sm`, captions `text-xs`.
- **Shape:** `rounded-lg` for controls, `rounded-xl` for cards and dialogs, 1px slate-200 borders, `shadow-xs` on surfaces.
- **States:** loading skeletons, empty states, inline field errors with an error summary, toasts for success and failure, and visible `:focus-visible` rings.

## Implementation checklist

| Level | Scope | Status |
| --- | --- | --- |
| 1 | Frontend foundation: layout, dashboard, Add Application form | ✅ Implemented and verified |
| 2 | Application management: view, edit, delete, search, filter, sort | ⬜ Not started |
| 3 | Express backend foundation and API | ⬜ Not started |
| 4 | MongoDB Atlas integration | ⬜ Not started |
| 5 | Authentication and security | ⬜ Not started |
| 6 | Connect frontend to API | ⬜ Not started |
| 7 | Kanban, analytics, calendar, activity, CSV export | ⬜ Not started |
| 8 | Testing, accessibility, and polish | ⬜ Not started |
| 9 | Deployment and documentation | ⬜ Not started |

**Level 1 verification:** `npm run lint` (0 problems), `npm test` (31 passing), and `npm run build` all succeed. The dashboard, navigation, sidebar collapse, mobile drawer, profile menu, validation, and the add-application flow were checked in a browser at desktop, tablet, and phone widths.

## Known limitations (Level 1)

- Data is in memory only. Reloading the page restores the sample data.
- The table's Actions column only links to the job posting. View, edit, delete, and status changes come in Level 2.
- Pipeline, Calendar, and Analytics are shown in the sidebar as "Coming soon" and are not clickable.
- No accounts yet. The profile menu shows a guest identity and a development-only "Reset sample data" action.
