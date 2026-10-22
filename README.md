# The Shehraz Barber — digital token & queue system

MERN (MongoDB, Express, React + Vite, Node) app that replaces paper token slips. Online and walk-in customers share **one FIFO queue**; barbers call and complete tokens; the owner manages services, staff, payments and reports; everything updates live over Socket.IO.

> **Status (2026-10-18): installs, typechecks and builds; tests and runtime not yet verified.** `npm install`, server `typecheck` and `build`, and the client `build` all pass. The server test suite (`npm test`) has **not been run** because `mongodb-memory-server` could not download its MongoDB binary in the build sandbox, and the app has **never been run against a database or in a browser**. Follow [First run checklist](#first-run-checklist). Nothing here is deployed.

## Project structure

```
client/                 React 18 + Vite + TypeScript + Tailwind v4
  public/logo.png       Official logo (do not replace)
  src/{components,context,hooks,layouts,pages,routes,services,types,utils}
server/                 Express + TypeScript + Mongoose + Socket.IO
  src/{config,controllers,middleware,models,routes,scripts,services,sockets,utils,validators}
  tests/                Vitest + Supertest + mongodb-memory-server
```

## Local setup

Requires Node 20+ and MongoDB (local, or an Atlas URI).

```bash
# 1. Backend
cd server
npm install
cp .env.example .env        # then fill in MONGODB_URI, SESSION_SECRET, TRACKING_SECRET
npm run seed                # services + settings (+ owner if OWNER_* are set, see below)
npm run dev                 # http://localhost:4000

# 2. Frontend (second terminal)
cd client
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173  (proxies /api and /socket.io to :4000)
```

Generate secrets: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` (use a different value for each).

### Windows setup (PowerShell)
1. Install **Node.js 20+** (LTS) and **MongoDB Community Server** (MSI, tick *Install MongoDB as a Service*; it listens on `127.0.0.1:27017`). Check: `node -v` and `Get-Service MongoDB` (start it with `net start MongoDB` in an admin terminal if stopped). MongoDB Atlas also works: use its connection string as `MONGODB_URI` and never share it.
2. Backend, in a first terminal:
   ```powershell
   cd shehraz-barber\server
   npm install
   copy .env.example .env
   notepad .env
   ```
   In `.env`: keep the default `MONGODB_URI` and `CLIENT_ORIGIN=http://localhost:5173`; generate **two different** values for `SESSION_SECRET` and `TRACKING_SECRET` by running `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` twice; choose your own `OWNER_NAME`, `OWNER_EMAIL` and `OWNER_PASSWORD` (12+ characters). Optionally set `DEV_SEED_PASSWORD` (10+ characters) for demo barbers.
   ```powershell
   npm run seed          # services, settings and your owner account
   npm run seed:dev      # optional demo barbers/reception/tokens
   npm run dev           # API on http://localhost:4000
   ```
   Then **delete the `OWNER_PASSWORD` line from `.env`**. Check `http://localhost:4000/api/health` shows `{"status":"ok","db":"up"}`.
3. Frontend, in a second terminal:
   ```powershell
   cd shehraz-barber\client
   npm install
   copy .env.example .env
   npm run dev
   ```
4. Open **`http://localhost:5173`**. Use `localhost`, **not** `127.0.0.1`: the server's origin guard only allows the exact `CLIENT_ORIGIN`, so sign-in and booking fail on `127.0.0.1`.

Troubleshooting: if PowerShell says `npm.ps1 cannot be loaded`, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (or use `npm.cmd`). `Fatal startup error: MongoServerSelectionError` means MongoDB is not running or `MONGODB_URI` is wrong. Demo accounts from `seed:dev`: `demo.barber1@demo.invalid`, `demo.barber2@demo.invalid`, `demo.reception@demo.invalid` (password = your `DEV_SEED_PASSWORD`).

### Testing on Windows
```powershell
cd shehraz-barber\server
npm run typecheck
npm test              # first run downloads a test MongoDB binary (needs internet access)
cd ..\client
npm run build
```
Manual checks (owner = the account you seeded):
1. **Booking:** `/book`, create a token, open its tracking link, refresh.
2. **Live queue (`/owner/queue`):** *Start service* on a waiting token (needs an available barber; otherwise you get a clear "No available barber" message), then *Complete service*. The token leaves the active lists and appears under *Completed today* and *All tokens*. Also try Skip, Cancel and Re-queue.
3. **Barber (`/barber`):** set Available, Call next, Complete; the customer tracking page and `/queue` update live.
4. **Payments and reports:** complete a service and confirm it shows **Unpaid** and is *not* in Overview "Received today". Record a payment (reception or owner): it becomes **Paid**, "Received today" and "Paid services" rise, and the outstanding amount drops. As owner use *Mark unpaid* (revenue drops again). Open Reports > *range*, try *Last 7 / 30 days*, a reversed range (clear warning) and *Export CSV*. Sign in as reception: *Mark unpaid* must not appear. Open `/owner/reports` signed out or as a barber: you are redirected.
4b. **Token receipt:** after booking you land on the receipt. Check name, token number, service, price, booking time and status. Tap *Share Token* (on a phone: native share sheet; on desktop: details are copied), *Share on WhatsApp* (opens WhatsApp with the details) and *Download Token* (saves a PNG). Confirm no extra token was created (Live queue / All tokens). Open the page at 320 px: no sideways scrolling.
5. **Settings (`/owner/settings`):** change text fields **and** each checkbox (online tokens, barber choice, phone required, enforce hours), press *Save settings* (a "Settings saved." message appears), refresh the page, then sign out and back in: every value must be unchanged. Try an invalid Instagram URL (e.g. `ftp://x`) and an empty salon name: you should see a clear error and nothing is saved.
6. **Layout:** check widths 320 / 375 / 768 / 1024 / 1440 px (browser dev tools).

### Creating the first owner
Set `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_PASSWORD` (12+ chars) in `server/.env`, run `npm run seed`, then **delete `OWNER_PASSWORD`** from the environment. No default credentials exist. Sign in at `/login`, then add barbers and reception staff under *Barbers & staff*.

### Optional demo data
`DEV_SEED_PASSWORD=... npm run seed:dev` creates clearly named demo barbers/tokens. Refused when `NODE_ENV=production`.

## First run checklist
```bash
cd server && npm run typecheck && npm test      # first test run downloads a MongoDB binary (needs internet access to fastdl.mongodb.org)
cd client && npm run build                      # typechecks then builds
```
Already verified: install, server typecheck/build, client build. **Still to verify:** `npm test`, and the manual smoke test below.
Then manually: book a token at `/book`, sign in as a barber, *Call next*, *Complete*, record payment as owner, and check `/owner/reports`. Test the pages at 320 / 375 / 768 / 1024 / 1440 px.

## Dashboards and routes
| Route | Role | Screen |
|---|---|---|
| `/owner` | owner | Overview (live metrics, **Payments & revenue** section: received today, paid services, completed-but-unpaid, outstanding unpaid; popular services; barber availability) |
| `/owner/queue` | owner | Live queue: walk-in tokens, **Start service** (waiting) and **Complete service** (in service), reassign, skip, cancel, re-queue, return in-service to queue, record payment |
| `/owner/tokens` | owner | All tokens by date with status/source/token-number filters and pagination; reassign and cancel waiting tokens; record payment / **mark unpaid** |
| `/owner/services` | owner | Add/edit/activate/deactivate services, demo-vs-confirmed price flag, public preview |
| `/owner/team` | owner | Add/edit/deactivate barbers and reception staff, service capabilities, availability, password reset |
| `/owner/reports` | owner | Daily / monthly / **date-range** reports, recorded revenue vs completed-but-unpaid, popularity, source and barber breakdown, CSV export |
| `/owner/audit` | owner | Audit log of the 100 most recent administrative actions |
| `/owner/settings` | owner | Salon details, hours, booking rules |
| `/barber` | barber | Availability, current customer, call next/start/complete, skip/no-show, completed-today history |
| `/reception` | staff | Queue desk: walk-in tokens, skip, cancel, re-queue, record payment (cannot mark a payment unpaid) |
| `/token/:trackingToken` | public | **Digital token receipt** (black-and-gold): greeting, token number, service, price, booking date/time, live status, queue position/wait only when the server has them; **Share Token**, **Share on WhatsApp**, **Download Token** (PNG) |

Route guards are a UX convenience only; every API call is authorized on the server.

## Key decisions
- **Auth:** HttpOnly, SameSite cookie holding a 12-hour signed JWT. The user is re-read from the DB on every request, so deactivating an account takes effect immediately. No tokens in localStorage.
- **CSRF:** every state-changing request needs `X-Requested-With: shehraz-web` and, if an `Origin` header exists, it must be in `CLIENT_ORIGIN`.
- **Token numbers:** `A-001…`, per Asia/Karachi business date, from an atomic `findOneAndUpdate $inc` on `DailyCounter`; unique index on `(businessDate, tokenNumber)`. A token created at 00:30 PKT belongs to the new day even if the server runs in UTC.
- **Idempotency:** `Idempotency-Key` header (generated per booking attempt) + partial unique index, so double-submits return the same token.
- **Concurrency:** every transition is one atomic `findOneAndUpdate` whose filter contains the expected status (loser gets 409). A partial unique index on `barberId` where `status=in_service` stops a barber having two active services.
- **Tracking:** customers use an HMAC-signed, unguessable tracking credential, never the DB id. Invalid and unknown credentials return the same 404. Public data never includes phone numbers.
- **Queue position / wait:** computed from the current waiting set (never stored). Estimates simulate available barbers and snapshot durations; `null` ("estimate unavailable") when it can't be computed reliably.
- **Owner start/complete:** the owner's *Start service* button calls the same `PATCH /staff/tokens/:id/start`. The status stored in MongoDB is `in_service` (shown as "In Service"). Because a token in service needs a serving barber, the server uses the barber assigned to the token, otherwise the first barber who is available, idle and offers the service; if nobody qualifies it returns 409 `NO_BARBER_AVAILABLE` and the token stays waiting. *Complete service* sets `completed` (it leaves the active queue and stays in the Completed list and All tokens). Both are atomic status-guarded updates, are audit-logged when done by the owner, and are owner/barber only (reception cannot).
- **Skipped → re-queue:** only owner/reception; the customer goes to the **back** of the queue. In-service → waiting recovery is owner-only.
- **Money:** payments are a separate collection (unique per token). Revenue = recorded payments only; completed-but-unpaid is reported separately; cancelled tokens can't be paid.
  - *Paid / Unpaid:* a completed token is **Unpaid** until a payment is recorded; then **Paid** (with amount, method and time). Waiting, in-service, skipped and cancelled tokens have no payment status.
  - *When revenue counts:* on the business date (Asia/Karachi) the payment was **recorded**, using the **server clock** (`paidAt`; any client-sent time is ignored). A service booked/completed yesterday and paid today is **today's** revenue. Unpaid amounts are never included.
  - *Who can do what:* owner and reception record payments; only the owner can **mark unpaid**. That is a non-destructive correction: the payment is flagged `void` with who/when/why, stops counting as revenue at once, the record is kept, and it is audit-logged (`payment.void`). Paying again re-activates the same record. Barbers and the public cannot touch payments or reports (backend-enforced).
  - *Existing data:* no migration is needed. Existing payments already have `status: "paid"` and the new void fields are optional; existing completed tokens without a payment simply show as Unpaid. Booking records and price snapshots are never modified.
- **Token receipt:** built only from the customer's own token data returned by the server (never hard-coded). Sharing, WhatsApp and Download are client-side and never call the booking API, so they cannot create another token. The share link is the customer's own tracking URL (no production URL is invented); phone numbers are never included. Native share is used when the browser supports it (receipt image + text); otherwise the details are copied or shown for manual copying. The PNG is drawn in the browser with the canvas API (no extra dependency).
- **Price snapshots:** tokens store name, price and duration at booking time.

## Data model & indexes
Collections: `services`, `users` (owner/barber/staff), `customers`, `tokens`, `dailycounters`, `payments`, `settings`, `auditlogs`.

| Collection | Indexes |
|---|---|
| tokens | unique `(businessDate, tokenNumber)`; `(businessDate, status, queuedAt, _id)`; `status`; unique partial `idempotencyKey`; unique partial `barberId` where `status=in_service` |
| dailycounters | unique `businessDate` |
| payments | unique `tokenId`; `(businessDate, status)` |
| users | unique `email`; `(role, isActive)` |
| services | unique case-insensitive `name`; `(isActive, sortOrder)` |
| customers | unique partial `phone` |

## API (`/api`)
**Public:** `GET /health`, `GET /services`, `GET /services/:id`, `GET /barbers`, `GET /settings/public`, `GET /queue/today`, `POST /tokens/online`, `GET /tokens/:trackingToken`, `PATCH /tokens/:trackingToken/cancel`
**Auth:** `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
**Staff (owner, barber, reception):** `GET /staff/queue`, `POST /staff/tokens/walk-in`, `PATCH /staff/tokens/:id/skip`; barber only: `POST /staff/queue/call-next`, `PATCH /staff/availability`; barber or owner: `PATCH /staff/tokens/:id/{start,complete}`; owner/reception: `PATCH /staff/tokens/:id/{cancel,requeue}`, `POST /staff/tokens/:id/payment`; owner only: `PATCH /staff/tokens/:id/payment/void`
**Owner:** `GET /owner/dashboard`, `GET /owner/tokens`, `GET /owner/reports/{daily,monthly,range}` (`range?from=YYYY-MM-DD&to=YYYY-MM-DD`, max 366 days), `GET|POST /owner/services`, `PATCH|DELETE /owner/services/:id` (DELETE = soft deactivate), `GET|POST /owner/barbers`, `PATCH /owner/barbers/:id`, `PATCH /owner/tokens/:id/reassign`, `POST /owner/tokens/:id/payment`, `GET|PATCH /owner/settings`, `GET /owner/audit`

Errors are `{ "error": { "code", "message", "details?" } }`.

Socket.IO events: `queue:updated`, `token:created|called|completed|skipped|cancelled|requeued`. Public room gets token number + status only; the staff room (authenticated by session cookie) also gets the token id. The client refetches the authoritative state on every event and after every reconnect.

## Environment variables
Backend: `NODE_ENV`, `PORT`, `MONGODB_URI`, `CLIENT_ORIGIN`, `SESSION_SECRET`, `TRACKING_SECRET`, `COOKIE_SAMESITE`, `SALON_TIMEZONE`, `OWNER_*` (seed only), `DEV_SEED_PASSWORD` (dev seed only), `RATE_LIMIT_DISABLED` (tests only).
Frontend (public values only): `VITE_API_BASE_URL`, `VITE_SOCKET_URL`.
Never commit `.env` files (they are git-ignored).

## Deployment
1. **MongoDB Atlas:** create a cluster, a database user, and allow your backend's IPs. Use the SRV URI as `MONGODB_URI`. Enable continuous/scheduled backups (Atlas Cloud Backup) and test a restore.
2. **Backend (Render, Node web service):** root `server`, build `npm install && npm run build`, start `npm start`, health check `/api/health`. Set the env vars above with `NODE_ENV=production`. Run `npm run seed` once (Render shell, with `OWNER_*` set temporarily).
3. **Frontend (Vercel):** root `client`, build `npm run build`, output `dist`. Set `VITE_API_BASE_URL` and `VITE_SOCKET_URL` to the backend.
4. **Cookies:** easiest is a shared site (e.g. `app.example.com` + `api.example.com`) with `COOKIE_SAMESITE=lax`. For fully separate domains use `COOKIE_SAMESITE=none` (HTTPS required) and set `CLIENT_ORIGIN` to the exact frontend origin. Alternatively rewrite `/api` and `/socket.io` on the frontend host to the backend.
5. Render's free tier sleeps when idle; use a paid instance for a real pilot.

## Business rules & limitations
- Opening hours, address and phone are **blank until the owner enters them**; nothing is invented. The Instagram link defaults to the official profile (https://www.instagram.com/the_shehraz_barber/) and can be changed in Settings.
- Services 4–7 (Beard Trim, Hair Wash, Hair Styling, Face Cleanup) use **demo prices** and show "Demo Price — Confirm with salon". Durations are initial estimates.
- Payments: one full payment per token. **No partial payments or refunds** yet.
- Single salon: counters/indexes are not yet scoped by salon id (the spots to change are commented in code).
- Rate limits are in-memory per server instance; use a shared store if you scale to several instances.
- Not implemented: scheduled appointments, SMS/WhatsApp notifications, online payment gateways, Playwright end-to-end tests.
