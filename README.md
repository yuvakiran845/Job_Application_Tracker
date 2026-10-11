# CareerFlow

CareerFlow is a job application tracker for students and job seekers. It keeps every application, interview, deadline, and recruitment update in one place.

> **Status: Level 2 of 9: application management.** The UI runs on development-only sample data held in memory. There is no backend, database, or authentication yet.

## Features so far

- **Dashboard:** totals, interviews, offers, rejections, a status breakdown, and recently added applications.
- **Applications list:**
  - Search by company or job title.
  - Filter by status, location, and applied-date range.
  - Sort from the menu or by clicking column headers.
  - Pagination with 10, 25, or 50 rows.
  - Search, filters, sort, and page are kept in the URL, so a view can be bookmarked or shared.
- **Add, view, edit, and delete** applications. Deleting asks for confirmation.
- **Inline status changes** from any list or the details page. The change shows immediately and is undone if saving fails. Moving a saved job to a submitted status records today as the applied date.
- **Full application record:** company, title, location, job URL, employment type, salary range, source, applied date, deadline, interview date and time, recruiter contact, notes, and created/updated timestamps.

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
      ui/            Design system: Button, Badge, Card, Field inputs, Modal, ConfirmDialog, DropdownMenu,
                     Pagination, Alert, Toaster, Skeleton, EmptyState
      layout/        Sidebar, mobile drawer, top bar, profile menu
      applications/  Table, filters, form, status select, row actions menu
      dashboard/     Stat cards, status breakdown
    layouts/         AppLayout (shell around every page)
    pages/           Dashboard, Applications, Application details, Not found, route error (+ page tests)
    context/         ApplicationsProvider (data state), ApplicationActionsProvider (dialogs), ToastProvider
    hooks/           useApplications, useApplicationActions, useApplicationQuery, useDebouncedInput,
                     useToast, useDialog, usePersistentState, usePageTitle
    services/        applicationService.js: the only data access point for the UI
    data/            sampleApplications.js: DEVELOPMENT-ONLY sample data
    constants/       Statuses, employment types, sources (mirror the future DB enums)
    utils/           Validation, query (search/filter/sort/paginate), stats, dates, model helpers (+ tests)
    test/            Test setup and render helpers
server/              Added in Level 3
```

### Data flow

```
Pages/components → useApplications() → ApplicationsProvider → services/applicationService.js
                                                               └─ Levels 1–2: in-memory mock seeded from data/sampleApplications.js
                                                               └─ Level 6: REST API calls (same function signatures)
```

Components never import sample data directly. The service functions (`list`, `create`, `update`, `delete`) are async and can throw a `ValidationError` with per-field errors or a `NotFoundError`, the same contract the API client will follow. Switching to the real backend therefore only changes `applicationService.js`.

Search, filtering, sorting, and pagination live in one pure function, `utils/applicationQuery.js`. Its parameters (`q`, `status`, `location`, `from`, `to`, `sort`, `order`, `page`, `pageSize`) are the same names used in the URL and planned for `GET /api/applications`, so this work can move to the server in Level 6 without changing the UI.

### Design decisions

- **Dates:**
  - Calendar dates (applied date, deadline) are stored as `YYYY-MM-DD` strings and read in local time, which avoids off-by-one-day timezone bugs.
  - Interview times are entered in the user's local time zone, stored as UTC ISO 8601 instants, and displayed with the time-zone name.
- **The application model** already uses the final field names (`company`, `jobTitle`, `appliedDate`, `status`, `contact`, timestamps, …) so the Mongoose model in Level 4 matches.
- **Modals and the mobile drawer** use the native `<dialog>` element for focus trapping, Escape handling, and inert backgrounds. Focus returns to the trigger on close.
- **Menus** render in a portal with fixed positioning, so scrolling tables can't clip them. They follow the WAI-ARIA menu-button pattern: arrow keys, Home/End, Escape, and focus return.
- **Text filters** update the URL after a 300 ms pause, so typing stays responsive and the browser history isn't flooded.
- **Client-side validation** exists for user experience only. The service validates the whole merged record on every update, and the server will re-validate every request (Level 3).

## Design system

- **Colour:** slate neutrals plus a single indigo `brand` accent (defined in `src/index.css`). Status colours appear only in badges and small indicators (`src/components/ui/tones.js`).
- **Type:** Inter (self-hosted via `@fontsource-variable/inter`). Page title `text-lg`, section title `text-base`, body `text-sm`, captions `text-xs`.
- **Shape:** `rounded-lg` for controls, `rounded-xl` for cards and dialogs, 1px slate-200 borders, `shadow-xs` on surfaces.
- **States:** loading skeletons, empty states, inline field errors with an error summary, toasts for success and failure, and visible `:focus-visible` rings.

## Implementation checklist

| Level | Scope | Status |
| --- | --- | --- |
| 1 | Frontend foundation: layout, dashboard, Add Application form | ✅ Implemented and verified |
| 2 | Application management: view, edit, delete, search, filter, sort | ✅ Implemented and verified |
| 3 | Express backend foundation and API | ⬜ Not started |
| 4 | MongoDB Atlas integration | ⬜ Not started |
| 5 | Authentication and security | ⬜ Not started |
| 6 | Connect frontend to API | ⬜ Not started |
| 7 | Kanban, analytics, calendar, activity, CSV export | ⬜ Not started |
| 8 | Testing, accessibility, and polish | ⬜ Not started |
| 9 | Deployment and documentation | ⬜ Not started |

**Latest verification (Level 2):** `npm run lint` (0 problems), `npm test` (75 passing: unit tests for validation, query, model, service, and dates, plus integration tests for every CRUD, status, search, filter, sort, and pagination flow), and `npm run build` all succeed. These were also checked in a browser at desktop and phone widths: menus near the bottom of the table, edit pre-fill, interview time-zone round trip, delete confirmation and redirect, and the mobile filter panel.

## Known limitations (Level 2)

- Data is in memory only. Reloading the page restores the sample data.
- Saved filter views are deferred to Level 7, where they can be stored per user. For now, bookmark the URL, which already contains the filters.
- Search covers company and job title only; location has its own filter.
- The status history and activity timeline are planned for Level 7. Only `createdAt` and `updatedAt` are tracked today.
- Pipeline, Calendar, and Analytics are shown in the sidebar as "Coming soon" and are not clickable.
- No accounts yet. The profile menu shows a guest identity and a development-only "Reset sample data" action.
