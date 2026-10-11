# CareerFlow

CareerFlow is a job application tracker for students and job seekers. It keeps every application, interview, deadline, and recruitment update in one place.

> **Status: Level 5 of 9: authentication and security.** Accounts, sign-in, and sessions (HttpOnly cookies) are working, and every API record is private to its owner. In API mode (`VITE_DATA_SOURCE=api`) the frontend requires sign-in. By default it still uses in-memory sample data as a guest, so it runs without a server, until Level 6 connects every screen to the API.

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
- **Accounts:** sign up, sign in, and sign out, with protected pages that return you to where you were after signing in.
- **Full application record:** company, title, location, job URL, employment type, salary range, source, applied date, deadline, interview date and time, recruiter contact, notes, and created/updated timestamps.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 4, lucide-react |
| Testing | Vitest 4, Testing Library, jsdom |
| Backend | Node.js, Express 5, MongoDB, Mongoose 9, zod (validation), cors |
| Security | bcrypt (`bcryptjs`), JWT (`jose`) in HttpOnly cookies, Helmet, `express-rate-limit`, CSRF protection |
| Backend testing | Vitest, supertest, mongodb-memory-server |

## Getting started

**Requirements:** Node.js `^20.19.0` or `>=22.12.0`, npm 10+. Node 22 or 24 LTS is recommended; Node 20 is past end-of-life.

**Frontend**

```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

**Backend** (needs MongoDB: a local install, Docker, or Atlas)

```bash
cd server
npm install
cp .env.example .env   # then set JWT_SECRET (and MONGODB_URI if needed)
npm run dev            # http://localhost:4000/api/health
```

**Frontend + backend together:** run both dev servers, then switch the frontend to the API:

```bash
echo VITE_DATA_SOURCE=api > client/.env.local
```

Restart `npm run dev` in `client/`. Vite forwards `/api` to `http://localhost:4000`, so no CORS setup is needed locally. Create an account on the sign-up page. To fill it with the sample applications, run:

```bash
npm run seed -- --email you@example.com
```

Delete `client/.env.local` to go back to sample data.

Running MongoDB locally with Docker: `docker run -d --name careerflow-mongo -p 27017:27017 mongo:8`.

| Command (in `client/`) | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `client/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint (including React Hooks rules) |
| `npm test` | Run unit and integration tests once |
| `npm run test:watch` | Run tests in watch mode |

| Command (in `server/`) | What it does |
| --- | --- |
| `npm run dev` | Start the API with auto-restart (`node --watch`) |
| `npm start` | Start the API |
| `npm run seed -- --email <you>` | Development only: add the 12 sample applications to an existing account. It refuses if the account already has data (add `--reset` to replace it), never creates accounts or touches other users, and refuses to run in production. |
| `npm run lint` | ESLint |
| `npm test` | API tests against a throwaway MongoDB (see below) |

**Backend tests** start a temporary MongoDB server for each run, with its own port and data directory, and delete it afterwards, so tests never touch real data. The first run downloads a MongoDB binary (about 100 MB, cached). To reuse an installed MongoDB instead, point `MONGOMS_SYSTEM_BINARY` at its `mongod` executable:

```bash
MONGOMS_SYSTEM_BINARY="C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe" npm test
```

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
server/
  src/
    server.js        Entry point: validate config → connect DB → listen → graceful shutdown
    app.js           createApp(): middleware, routes, error handling (no DB/port, so tests can use it)
    config/          env.js (validated with zod, fails fast), database.js
    models/          User (unique email, bcrypt hash, tokenVersion), Application (owner reference, indexes)
    validators/      zod schemas for request bodies, query strings and route params
    middleware/      requireAuth, CSRF, rate limits, validate, request logger, 404 + central error handler
    controllers/     HTTP ⇄ service translation
    services/        Business rules and owner-scoped database access
    routes/          /api/applications router
    constants/ utils/
  test/              API tests (supertest) + throwaway MongoDB setup
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
- **Validation runs in layers.** Client-side checks exist for user experience. The API validates every request with zod, which strips unknown fields, so a client can never set `userId`, `_id`, or timestamps. The Mongoose schema enforces the same rules again before saving.
- **Indexes:** every index starts with `userId` (`{userId, createdAt}`, `{userId, status}`, `{userId, appliedDate}`, `{userId, deadline}`), because every query is scoped by owner. Tests run MongoDB's `explain()` on the real list and stats queries and fail on a collection scan. Case-insensitive collation is applied only when sorting by company, because string comparisons can use an index only when the collations match.
- **Data source switch:** `client/src/services/applicationService.js` delegates to `apiApplicationService.js` (HTTP via `apiClient.js`) or `mockApplicationService.js` (sample data). Both share function signatures and error types (`ValidationError`, `NotFoundError`, `ApiError`), so the UI doesn't know which one is active.
- **Ownership:** every database query includes the authenticated owner's `userId`, taken from the verified session and never from the request. Records belonging to other users return 404, the same as missing ones, so their existence isn't revealed.

## MongoDB Atlas setup

The API works with any MongoDB 7+ server. For a hosted database, use MongoDB Atlas (the free M0 tier is enough):

1. **Create a cluster:** create an Atlas project and a free M0 cluster, in a region close to where the API will run.
2. **Create a database user:** under *Database Access*, add a user with a generated strong password. Prefer *Specific privileges → `readWrite` on database `careerflow`* over "read and write to any database".
3. **Allow network access:** under *Network Access*, add your current IP address for local development. For a deployed API, add your host's outbound IP addresses. Use `0.0.0.0/0` only if the host has no fixed IPs, and then rely on a strong password and TLS, which Atlas always uses.
4. **Copy the connection string:** *Connect → Drivers* gives a `mongodb+srv://…` string.
   - **Add the database name** before the `?`: `…mongodb.net/careerflow?retryWrites=true&w=majority`. Without it, the data goes to a database called `test`, and the server logs a warning.
   - **URL-encode** special characters in the password (`@` → `%40`, `:` → `%3A`, `/` → `%2F`).
5. **Configure the API:** put the string in `server/.env` as `MONGODB_URI`. `.env` is git-ignored; never commit it or paste it into chats or issues. In production, use your host's secret settings instead of a file (Level 9).
6. **Check it:** run `npm run dev`. The log should show `MongoDB connected {"database":"careerflow",…}` (the URI itself is never logged), and `GET /api/health` should report `"database":"connected"`. Optionally run `npm run seed`.

| Problem | Likely cause |
| --- | --- |
| `Server selection timed out` | Your IP isn't on the Atlas network access list |
| `bad auth : authentication failed` | Wrong user or password, or special characters not URL-encoded |
| Warning about the `test` database | Database name missing from the URI |

## Authentication and security

| Concern | Implementation |
| --- | --- |
| Passwords | bcrypt with cost 12 (`bcryptjs`, the same algorithm and hash format as native `bcrypt`, with no native build step). Passwords are 8–64 characters and at most 72 bytes, because bcrypt ignores anything longer. No composition rules, per current NIST guidance. Never stored, logged, or returned. |
| Sessions | A signed JWT (HS256, with `iss`, `aud`, and `exp`; 7 days by default) in a `cf_session` cookie that is HttpOnly, `SameSite=Lax`, `Secure` in production, and limited to `Path=/api`. JavaScript can't read it, so cross-site scripting can't steal it, and nothing is stored in localStorage. |
| Every request | `requireAuth` verifies the token and reloads the user, so deleted accounts are refused immediately. A `tokenVersion` mismatch means the session was revoked: changing the password signs out every other session. |
| CSRF | Three layers: the SameSite cookie; a required `X-CSRF-Protection: 1` header on every non-GET request (browsers only let allowed origins send it, after a CORS preflight); and a check that any `Origin` header is an allowed origin. |
| Brute force | Sign-in and password checks: 10 failed attempts per 15 minutes per IP (successful sign-ins don't count). Sign-up: 10 per hour per IP. Sign-in returns the same message, after the same amount of work, for unknown emails and wrong passwords. |
| Headers | Helmet: CSP, HSTS, `nosniff`, frame and referrer policies, and `Cross-Origin-Resource-Policy: same-site`. |
| Frontend | Protected routes redirect to `/login?next=…`; only same-app paths are accepted as `next`. Data providers live inside the signed-in layout, so signing out drops the previous user's data from memory. An expired or revoked session sends the user back to sign in. |

**Deployment note:** cookies work best when the frontend and API share a site, for example `app.example.com` and `api.example.com`, with `COOKIE_SAMESITE=lax`. If they must be on different sites, set `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`; the CSRF header and Origin checks still protect writes. Rate limits use in-memory storage, which is correct for one server instance. Behind a proxy, set `TRUST_PROXY`.

## API reference

Base URL: `/api`. Successful responses are `{ "data": … }`, and lists add `"meta"`. Errors are `{ "error": { "code", "message", "details?" } }`. Every route except `/health` and the sign-in and sign-up routes requires a session. Every non-GET request must send `X-CSRF-Protection: 1`.

| Method | Path | Success | Notes |
| --- | --- | --- | --- |
| GET | `/health` | 200 / 503 | Public. Reports API and database status. |
| POST | `/auth/register` | 201 | `{ name, email, password }`. Signs the user in (sets the cookie). Returns 409 `EMAIL_TAKEN` if the email is already registered. |
| POST | `/auth/login` | 200 | `{ email, password }`. Sets the cookie. Returns 401 `INVALID_CREDENTIALS` for a wrong email or password. |
| POST | `/auth/logout` | 204 | Clears the cookie. |
| GET | `/auth/me` | 200 | The current user `{ id, name, email, createdAt, updatedAt }`. |
| PATCH | `/users/me` | 200 | `{ name?, email?, currentPassword? }`. Changing the email requires `currentPassword`. |
| PUT | `/users/me/password` | 204 | `{ currentPassword, newPassword }`. Signs out all other sessions. |
| GET | `/applications` | 200 | Query: `q`, `status`, `location`, `from`, `to` (applied date, `YYYY-MM-DD`), `sort` (`createdAt`, `appliedDate`, `company`, `deadline`, `status`), `order` (`asc`/`desc`), `page`, `pageSize` (max 100). Returns `meta: { page, pageSize, total, pageCount }`. |
| POST | `/applications` | 201 | Required fields: `company`, `jobTitle`, `location`, `status`. Returns a `Location` header. |
| GET | `/applications/stats` | 200 | Counts by status, plus `appliedSince` (optional query `appliedSince=YYYY-MM-DD`; default is the last 30 days). |
| GET | `/applications/:id` | 200 | |
| PUT | `/applications/:id` | 200 | Any subset of fields. The merged record is validated as a whole. |
| DELETE | `/applications/:id` | 204 | |

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Invalid body or query; `details.fieldErrors` maps fields (e.g. `contact.email`) to messages |
| 400 | `INVALID_ID` / `INVALID_JSON` | Malformed ID or JSON body |
| 401 | `AUTH_REQUIRED` / `INVALID_CREDENTIALS` | No valid session; wrong email or password |
| 403 | `CSRF_REJECTED` | A write without the CSRF header, or from an origin that isn't allowed |
| 409 | `EMAIL_TAKEN` | Email already registered (`details.fieldErrors.email`) |
| 429 | `RATE_LIMITED` | Too many attempts (`Retry-After` header included) |
| 404 | `NOT_FOUND` / `ROUTE_NOT_FOUND` | Missing (or someone else's) record; unknown route |
| 413 | `PAYLOAD_TOO_LARGE` | Body over 50 KB |
| 500 | `INTERNAL_ERROR` | Unexpected error. Details are logged server-side and never sent to the client. |

**Data formats:** `appliedDate` and `deadline` are `YYYY-MM-DD` calendar dates. `interviewDate`, `createdAt`, and `updatedAt` are ISO 8601 instants in UTC. Empty optional fields are `""`.

### Environment variables (`server/.env`)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development` or `production` (tests use `test`) |
| `PORT` | no | `4000` | HTTP port |
| `MONGODB_URI` | yes | — | MongoDB connection string. Never committed, and never logged (credentials are masked). |
| `CLIENT_ORIGIN` | no | `http://localhost:5173` | Comma-separated browser origins allowed by CORS |
| `JWT_SECRET` | yes | — | Signs session tokens; at least 32 random characters, unique per environment. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `SESSION_DAYS` | no | `7` | How long a sign-in lasts |
| `COOKIE_SECURE` | no | `true` in production | Send the cookie over HTTPS only |
| `COOKIE_SAMESITE` | no | `lax` | `lax`, `strict`, or `none` (`none` requires `COOKIE_SECURE=true`) |
| `TRUST_PROXY` | no | `0` | Number of proxies in front of the API (usually `1` on hosting platforms) |
| `BCRYPT_ROUNDS` | no | `12` | bcrypt cost (at least 10 in production; tests use 4) |

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
| 3 | Express backend foundation and API | ✅ Implemented and verified |
| 4 | MongoDB Atlas integration | ✅ Implemented and verified (local MongoDB 8.2; Atlas guide above) |
| 5 | Authentication and security | ✅ Implemented and verified |
| 6 | Connect frontend to API | ⬜ Not started |
| 7 | Kanban, analytics, calendar, activity, CSV export | ⬜ Not started |
| 8 | Testing, accessibility, and polish | ⬜ Not started |
| 9 | Deployment and documentation | ⬜ Not started |

**Latest verification (Level 2):** `npm run lint` (0 problems), `npm test` (75 passing: unit tests for validation, query, model, service, and dates, plus integration tests for every CRUD, status, search, filter, sort, and pagination flow), and `npm run build` all succeed. These were also checked in a browser at desktop and phone widths: menus near the bottom of the table, edit pre-fill, interview time-zone round trip, delete confirmation and redirect, and the mobile filter panel.

**Level 3 verification:** `npm run lint` (0 problems) and `npm test` (43 passing: CRUD, validation, ownership isolation, list query, stats, CORS, error handling, config) in `server/`. These were also checked against a real local MongoDB 8.2 with curl:
- every endpoint, including invalid and missing IDs
- data persisting across a server restart
- request logs containing no query strings
- production mode answering 401 on private routes
- startup refusing a `DEV_USER_ID` in production (that placeholder was replaced by real authentication in Level 5)

**Level 4 verification:**
- **Server:** `npm test` (53 passing, including index-usage checks via `explain()` and the seed safety rules).
- **Client:** `npm test` (85 passing, including HTTP error mapping).
- **End-to-end** with the frontend in API mode against local MongoDB 8.2:
  - The dashboard loads the seeded records.
  - A record added in the UI survives an API restart and a page reload, and can be deleted in the UI.
  - With the API stopped, the UI shows "server unavailable", and **Try again** recovers once it's back.

**Level 5 verification:**
- **Server:** `npm test` (82 passing: registration, login, sessions, tampered/expired/foreign-secret/revoked tokens, logout, CSRF, rate limits, profile and password changes, Helmet headers, and two-user isolation for every application route).
- **Client:** `npm test` (112 passing: protected routes, sign-in/sign-up validation and errors, open-redirect protection, sign-out, expired sessions, API client CSRF/401 handling).
- **End-to-end** against a real API and local MongoDB in the browser:
  - Signing up returns you to the page you asked for.
  - The session cookie is invisible to JavaScript.
  - The session survives a reload.
  - Signing out ends the server session.
  - A second account sees none of the first account's data; its URLs give "not found" in the UI and 404 from the API.
  - A wrong password is refused.
  - A revoked session sends the user back to sign in, and the refused write is not saved.
  - Failed sign-ins hit 429 with `Retry-After`.
  - The API log contains no emails, passwords, or tokens.

## Known limitations

- The frontend defaults to in-memory sample data. In API mode it currently loads all of the user's applications and filters them in the browser; Level 6 moves search, filters, pagination, and stats to the API's query parameters and `/stats` endpoint.
- Verified against a local MongoDB 8.2. Connecting to Atlas needs your own cluster and credentials (see *MongoDB Atlas setup*).
- There's no profile page in the UI yet (the API supports profile and password updates); it comes with Level 6. Password reset by email isn't included, because email integrations are out of scope.
- Saved filter views are deferred to Level 7, where they can be stored per user. For now, bookmark the URL, which already contains the filters.
- Search covers company and job title only; location has its own filter.
- The status history and activity timeline are planned for Level 7. Only `createdAt` and `updatedAt` are tracked today.
- Pipeline, Calendar, and Analytics are shown in the sidebar as "Coming soon" and are not clickable.
- Sample-data mode has no sign-in: it uses a clearly labelled guest.
