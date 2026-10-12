# Development log

CareerFlow was built in nine levels, each finished, tested, and reviewed before the next started. This page records what each level covered and how it was verified. The [README](../README.md) describes the finished app.

Test counts are the totals at the end of each level.

## Levels

| Level | Scope | Status |
| --- | --- | --- |
| 1 | Frontend foundation: layout, dashboard, Add Application form | ✅ Implemented and verified |
| 2 | Application management: view, edit, delete, search, filter, sort | ✅ Implemented and verified |
| 3 | Express backend foundation and API | ✅ Implemented and verified |
| 4 | MongoDB Atlas integration | ✅ Implemented and verified (local MongoDB 8.2; Atlas steps in the README) |
| 5 | Authentication and security | ✅ Implemented and verified |
| 6 | Connect frontend to API | ✅ Implemented and verified |
| 7 | Kanban, analytics, calendar, activity, CSV export, saved views | ✅ Implemented and verified |
| 8 | Testing, accessibility, and polish | ✅ Implemented and verified |
| 9 | Deployment and documentation | ✅ Implemented, deployed, and verified |

**Level 2 verification:** `npm run lint` (0 problems), `npm test` (75 passing: unit tests for validation, query, model, service, and dates, plus integration tests for every CRUD, status, search, filter, sort, and pagination flow), and `npm run build` all succeed. These were also checked in a browser at desktop and phone widths: menus near the bottom of the table, edit pre-fill, interview time-zone round trip, delete confirmation and redirect, and the mobile filter panel.

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

**Level 6 verification:**
- **Client:** `npm test` (125 passing, including the new tests below). Production builds were checked to contain no sample data, both by default and with `VITE_DATA_SOURCE=mock` set.
  - Account settings.
  - Cache isolation between users.
  - Optimistic status changes and rollback.
  - Recovery when a page empties after deletes.
  - Never showing an overall total smaller than the filtered results.
  - Server-side list, stats, and detail requests.
- **Server:** `npm test` (82 passing; no server changes in this level).
- **End-to-end** in the browser against the real API and local MongoDB:
  - A new user signed up and saw an empty dashboard.
  - They added an application, edited it, changed its status, and deleted it (with confirmation). The dashboard numbers followed each step, and the API confirmed each change.
  - The data persisted across a reload and across signing out and back in.
  - Search, filters, and paging went to the server as query parameters.
  - A second user saw none of the first user's data.
  - Account settings updated the name, and the password change kept this session signed in while invalidating the old password.
  - No horizontal scrolling at phone width.
  - This run found a stale total ("5 of 0 applications"), which is now fixed and covered by a test.

**Level 7 verification:**
- **Server:** `npm test` (100 passing; 18 new):
  - Activity: recorded names only, private to the owner, deleted with the application, none invented.
  - CSV: escaping, formula neutralization, filters, ownership.
  - Analytics: definitions, week/month/year buckets, range validation, ownership.
  - Events: local-day boundaries across time zones, validation, ownership.
  - Saved views: normalization, duplicate names, the 20-view limit, privacy.
- **Client:** `npm test` (143 passing; 18 new):
  - Kanban moves via the status menu and via drag-and-drop.
  - Calendar agenda labels and keyboard navigation.
  - Exact analytics numbers for two ranges, plus the table view.
  - Activity timeline, CSV download contents, saving and re-applying a view, the dashboard's upcoming card.
  - Calendar and analytics helpers.
- **End-to-end** in the browser against the real API and local MongoDB:
  - A real `DragEvent` drag moved a card; the column highlighted and the server confirmed the change.
  - The timeline showed only the recorded change.
  - Calendar events landed on the correct local days in GMT+5:30, with stage labels.
  - Analytics numbers matched the data, and the chart chunk loaded only on that page.
  - The CSV export had the right headers, rows, and byte-order mark.
  - A saved view persisted in normalized form.
  - No horizontal overflow on any page at phone width. This run caught screen-reader-only text widening the page from inside the Kanban scroller, which is now fixed.

**Level 8 verification:** every command below was run and passed on the final code.
- **Server:** `npm run lint` (0 problems), `npm test` (107 passing; 7 new): a real database disconnect answers 503 within 8 seconds and recovers, driver errors map to 503 with `Retry-After`, configurable rate limits, and analytics checked against brute-force counts on 4 seeded random datasets of 300 records.
- **Client:** `npm run lint` (0 problems), `npm test` (144 passing), `npm run build` (main bundle 145 KB gzipped; the chart code loads only on Analytics).
- **End-to-end:** `npx playwright test` (36 passing: 32 desktop, 4 on a Pixel 7 profile, in Edge). The suite also passed 3 times in a row (`--repeat-each=3`, 96 of 96) to check for flaky tests.

| Requirement | Where it's tested |
| --- | --- |
| Registration and login | E2E `auth`: sign-up, session survives reload, return to the requested page. Server `auth`. Client `Auth`. |
| Invalid credentials | E2E: wrong password and unknown email give the same message. Server: same 401 response for both. |
| Protected routes | E2E: redirect with `next`; every private API route answers 401 `AUTH_REQUIRED`; writes without the CSRF header or from a foreign origin answer 403. |
| CRUD, persistence | E2E `applications`: add (with validation), edit, status change, details, delete with confirmation, all checked after reload. |
| Search and filter combinations | E2E: search + status + location narrowing step by step, a shareable URL restored on reload, a date range, and no-match. Server and client query tests. |
| Status changes | E2E: from the table and from a pipeline card, recorded in the activity timeline; a failed save rolls back. |
| Empty account | E2E: a new account's dashboard, list, and every page's empty state (also scanned by axe). |
| Invalid input | E2E: field errors in the form; the API returns field-level `VALIDATION_ERROR`s and strips unknown fields such as `userId`. |
| Missing or invalid IDs | E2E: malformed and unknown IDs show "Application not found"; API 400 `INVALID_ID` / 404. Unknown pages show a not-found page. |
| API and database failures | Server: real disconnect → 503. E2E `resilience`: 503 on load shows the reason and **Try again** recovers; server unreachable at startup; expired session mid-task → sign in → back. |
| Authorization and cross-user isolation | E2E `isolation`: a second user gets 404 for another user's application (read, activity, update, delete), saved views, and stats, and their export doesn't include it. The owner's data is unchanged. Server tests cover every route. |
| Analytics accuracy | E2E: a hand-checked dataset gives exact rates for two ranges. Server: randomized brute-force comparison. Client: exact numbers and the table view. |
| CSV export permissions | E2E: download contains only the filtered rows of the signed-in user, has a BOM, and neutralizes formulas; unauthenticated export is 401. |
| Mobile and desktop layouts | E2E `mobile`: no page scrolls sideways at phone width (with very long names), the navigation drawer, the list layout, the add form fitting the screen, and 36px touch targets. Desktop: no sideways scrolling on any page. |
| Keyboard navigation | E2E `keyboard`: skip link, sidebar by Tab/Enter, adding an application without a mouse, Escape returning focus, profile menu arrows/Home/End, delete confirmation focusing Cancel, calendar arrow keys. |
| Accessible labels | E2E `accessibility`: axe-core WCAG 2.1 A/AA on every page (with data and empty), sign-in with errors, dialogs, menus, and the analytics table. Also checks one `h1` and one `main` per page, and a name on every visible control. |

Issues the new tests found, now fixed:
- **Low-contrast text.** The empty Kanban columns (4.42:1) and calendar days from other months (2.63:1) were below the 4.5:1 minimum.
- **Pipeline board keyboard access.** The board scrolled sideways but couldn't be reached by keyboard when it had no cards. It's now a focusable, labelled region.
- **Focusable hidden chart.** The analytics chart, which is hidden from screen readers, had a keyboard focus layer. That layer is now off, and the table view carries the data.
- **Invalid details markup.** The details page had an invalid `<dl>` structure.
- **Wrong count wording.** Kanban counts read "1 applications" to screen readers.
- **Closed applications in "Upcoming".** The calendar's "Upcoming" list showed deadlines for rejected applications.

**Level 9 verification:** every command below was run and passed on the final code.
- **Live deployment:** https://careerflow-51i3.onrender.com, deployed 2026-10-12 from commit `b77e62c` (Render free plan, Singapore, with MongoDB Atlas).
  - **First attempt failed at startup.** The connection string still contained the `<` from Atlas's `<db_password>` template and had no database name. With a corrected string and a new password, it connected.
  - **Startup logs:** `MongoDB connected {"database":"careerflow"}`, then `listening … "frontend":"served by this server"`. Render's health checks get `200`.
  - **Checked from outside with curl:**
    - `/api/health` returns `200 ok`, database connected.
    - HTTP redirects to HTTPS (301).
    - The page carries CSP, HSTS, `nosniff`, `X-Frame-Options`, and referrer, COOP, and CORP policies, with `Cache-Control: no-cache`.
    - Assets are `public, max-age=31536000, immutable` and Brotli-compressed. The served bundle is the same file as the locally tested build (`index-viBE1FI7.js`).
    - Deep links return the app; a missing asset returns a JSON 404.
    - Private API routes without a session return `401 AUTH_REQUIRED`. Writes from another origin or without the CSRF header return `403`, and no CORS headers go to other origins.
    - The session cookie is `HttpOnly; Secure; SameSite=Lax; Path=/api` (seen on sign-out, which creates no account).
  - **In a browser:** the sign-in page renders, its first API call succeeds, and the console shows no errors or CSP violations.
  - No test account was created on the live site; signing up and using the app there is left to the owner.
- **Server:** `npm run lint` (0 problems), `npm test` (119 passing; 12 new):
  - Production defaults (same-origin only, serve the frontend).
  - `CLIENT_ORIGIN` validation and normalization.
  - Errors that never echo values.
  - Serving the build: deep links, a no-cache `index.html`, year-long immutable assets, gzip, and JSON 404s for missing files and unknown API routes.
  - Same-origin writes allowed and foreign ones refused; CORS preflights for a separately hosted frontend; look-alike origins rejected.
- **Client:** `npm run lint` (0 problems), `npm test` (144 passing), `npm run build`.
- **End-to-end:** 36 passing in development mode, and 36 passing in production mode (`E2E_MODE=production`: one server, `NODE_ENV=production`, Secure cookies, Helmet headers).
- **Deploy dry run from a clean copy:** the files that will be committed were copied without `node_modules`, `.env`, or build output, and built with Render's exact command (`npm run build:deploy`) with `NODE_ENV=production` set, as on Render.
  - The build succeeded with 0 vulnerabilities, and the server got no dev dependencies.
  - All 36 browser tests passed against that copy in production mode.
- **Production responses, checked with curl:**
  - The session cookie is `HttpOnly; Secure; SameSite=Lax; Path=/api`.
  - Pages carry CSP, HSTS, `nosniff`, `X-Frame-Options`, a referrer policy, and COOP/CORP, with `Cache-Control: no-cache`.
  - Hashed assets are `public, max-age=31536000, immutable` and gzip-encoded.
  - Deep links return the app.
  - A write from a foreign origin gets 403, and no CORS headers are sent to it.
- **Secrets:** the full git history and the files about to be committed were scanned for credentials (MongoDB URIs with passwords, JWT secrets, private keys, cloud and GitHub tokens). The only matches are the fake `cluster.example` strings in the log-redaction tests. No `.env` file has ever been committed. The E2E suite now generates a random JWT secret per run.
- **Configuration files:** `render.yaml` and the CI workflow parse as valid YAML, and their fields follow Render's Blueprint documentation. Neither has run on its platform yet.
- **Screenshots:** captured from the running app with the sample data. Reviewing them found two layout bugs, now fixed:
  - **Squeezed legend dots.** Status legend dots shrank to nothing when labels didn't fit, which lost the colour key for Assessment, Interview, and Withdrawn. The legend's columns now follow the card's width (a container query), and the dots can't shrink.
  - **Stretched dashboard card.** The status breakdown stretched to the height of the Upcoming card, leaving an empty white area. Recently added now sits under the breakdown, beside Upcoming.
- **Not verified:** Node 22 locally (this machine has Node 20.19.6; Render and CI use 22). CI's first run (#1) passed the server and client jobs but failed in the browser-test job. Its logs are visible only to repository admins, and the same suite passes locally under CI-like settings, so the cause is still open.
