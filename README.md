# The Shehraz Barber — digital token & queue system

MERN (MongoDB, Express, React + Vite, Node) app that replaces paper token slips. Online and walk-in customers share **one FIFO queue**; barbers call and complete tokens; the owner manages services, staff and reports (customers pay their barber in person, so the app records no payments); everything updates live over Socket.IO.

> **Status (2026-10-18): installs, typechecks and builds; tests and runtime not yet verified.** `npm install`, server `typecheck` and `build`, and the client `build` all pass. The server test suite (`npm test`) has **not been run** because `mongodb-memory-server` could not download its MongoDB binary in the build sandbox, and the app has **never been run against a database or in a browser**. Follow [First run checklist](#first-run-checklist). Nothing here is deployed.

## Photos and videos
Drop files into `client/public/media/` (names listed in `client/public/media/README.txt`: `hero.mp4`, `hero.jpg`, `about.jpg`, `cta.jpg`, `gallery-1.jpg` … `gallery-6.jpg`). Missing files show a styled placeholder. Paths and gallery captions live in `client/src/config/media.ts`. Rebuild the client after adding files.

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
4. **Reports:** complete a few services, then open `/owner` (Earnings today = completed services × booked price) and Reports > *range*: try *Last 7 / 30 days*, a reversed range (clear warning) and *Export CSV*. Open `/owner/reports` signed out or as a barber: you are redirected.
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
Then manually: book a token at `/book`, sign in as a barber, *Call next*, *Complete*, and check earnings on `/owner/reports`. Test the pages at 320 / 375 / 768 / 1024 / 1440 px.

## Dashboards and routes
| Route | Role | Screen |
|---|---|---|
| `/owner` | owner | Overview (live metrics, **earnings today**, popular services, barber availability) |
| `/owner/queue` | owner | Live queue: walk-in tokens, **Start service** (waiting) and **Complete service** (in service), reassign, skip, cancel, re-queue, return in-service to queue |
| `/owner/tokens` | owner | All tokens by date with status/source/token-number filters and pagination; reassign and cancel waiting tokens |
| `/owner/services` | owner | Add/edit/activate/deactivate services, demo-vs-confirmed price flag, public preview |
| `/owner/team` | owner | Add/edit/deactivate barbers and reception staff, service capabilities, availability, password reset |
| `/owner/reports` | owner | Daily / monthly / **date-range** reports, earnings (total, per day, per service, per barber), source breakdown, CSV export |
| `/owner/audit` | owner | Audit log of the 100 most recent administrative actions |
| `/owner/settings` | owner | Salon details, hours, booking rules |
| `/barber` | barber | Availability, current customer, call next/start/complete, skip/no-show, completed-today history |
| `/reception` | staff | Queue desk: walk-in tokens, skip, cancel, re-queue |
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
- **Money:** customers pay their barber in person (cash), so the app has **no payment recording**. *Earnings* = the price snapshotted at booking for every token **completed** in the period, attributed to the token's business date. Waiting, in-service, skipped and cancelled tokens count 0. A `payments` collection left over from older versions is ignored.
- **Token receipt:** built only from the customer's own token data returned by the server (never hard-coded). Sharing, WhatsApp and Download are client-side and never call the booking API, so they cannot create another token. The share link is the customer's own tracking URL (no production URL is invented); phone numbers are never included. Native share is used when the browser supports it (receipt image + text); otherwise the details are copied or shown for manual copying. The PNG is drawn in the browser with the canvas API (no extra dependency).
- **Price snapshots:** tokens store name, price and duration at booking time.

## Data model & indexes
Collections: `services`, `users` (owner/barber/staff), `customers`, `tokens`, `dailycounters`, `settings`, `auditlogs`.

| Collection | Indexes |
|---|---|
| tokens | unique `(businessDate, tokenNumber)`; `(businessDate, status, queuedAt, _id)`; `status`; unique partial `idempotencyKey`; unique partial `barberId` where `status=in_service` |
| dailycounters | unique `businessDate` |
| users | unique `email`; `(role, isActive)` |
| services | unique case-insensitive `name`; `(isActive, sortOrder)` |
| customers | unique partial `phone` |

## API (`/api`)
**Public:** `GET /health`, `GET /services`, `GET /services/:id`, `GET /barbers`, `GET /settings/public`, `GET /queue/today`, `POST /tokens/online`, `GET /tokens/:trackingToken`, `PATCH /tokens/:trackingToken/cancel`
**Auth:** `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
**Staff (owner, barber, reception):** `GET /staff/queue`, `POST /staff/tokens/walk-in`, `PATCH /staff/tokens/:id/skip`; barber only: `POST /staff/queue/call-next`, `PATCH /staff/availability`; barber or owner: `PATCH /staff/tokens/:id/{start,complete}`; owner/reception: `PATCH /staff/tokens/:id/{cancel,requeue}`
**Owner:** `GET /owner/dashboard`, `GET /owner/tokens`, `GET /owner/reports/{daily,monthly,range}` (`range?from=YYYY-MM-DD&to=YYYY-MM-DD`, max 366 days), `GET|POST /owner/services`, `PATCH|DELETE /owner/services/:id` (DELETE = soft deactivate), `GET|POST /owner/barbers`, `PATCH /owner/barbers/:id`, `PATCH /owner/tokens/:id/reassign`, `GET|PATCH /owner/settings`, `GET /owner/audit`

Errors are `{ "error": { "code", "message", "details?" } }`.

Socket.IO events: `queue:updated`, `token:created|called|completed|skipped|cancelled|requeued`. Public room gets token number + status only; the staff room (authenticated by session cookie) also gets the token id. The client refetches the authoritative state on every event and after every reconnect.

## Environment variables
Backend: `NODE_ENV`, `PORT`, `MONGODB_URI`, `CLIENT_ORIGIN`, `SESSION_SECRET`, `TRACKING_SECRET`, `COOKIE_SAMESITE`, `SALON_TIMEZONE`, `OWNER_*` (seed only), `DEV_SEED_PASSWORD` (dev seed only), `RATE_LIMIT_DISABLED` (tests only).
Frontend (public values only): `VITE_API_BASE_URL`, `VITE_SOCKET_URL`.
Never commit `.env` files (they are git-ignored).

## Deploying to cPanel (build locally, pull on the server)
Shared hosting usually can't run `npm run build` (no `npm` on the SSH `PATH`, tight memory limits), so everything is built on your PC and the **result is committed**:

```powershell
npm run deploy:build      # in the project root; installs, type-checks, builds and checks both parts
git add deploy && git commit -m "Build for hosting" && git push
```

### What is committed, what is not

| Path | In Git? | What it is |
|---|---|---|
| `deploy/public_html/` | **Yes** — the website artifact | Built HTML/CSS/JS, the 16 photos/videos, `.htaccess`, `config.example.js`, `version.json` |
| `deploy/api/` | **Yes** — the API artifact | The whole server bundled into `server.js` (+ `seed.js`). No `node_modules`, no `npm install` on the host |
| `client/dist/` | No (git-ignored) | Local Vite output; `deploy:build` copies it into `deploy/public_html` |
| `config.js` (live) | No — lives only on the server | The API URLs. The build ships `config.example.js` instead, so a deploy can never overwrite it |
| `.env` files | Never | Secrets. Only `.env.example` is committed |

`deploy:build` always starts from an empty `client/dist` and fails if `index.html` points at a missing bundle, if `assets/` holds anything unreferenced, or if any file in `client/src/config/media.ts` is missing.

### Updating the live website (SSH)
The repository is cloned on the server (cPanel *Git Version Control*). Paths below use `~/repositories/barbar`; use your clone's path.

```sh
cd ~/repositories/barbar
git status --short                 # must print nothing; never edit files in the clone
git pull --ff-only origin main     # or "Update from Remote" in cPanel Git Version Control
sh scripts/deploy-frontend.sh ~/shehraz-barbar.digitalmarketingshub.com/public_html
curl -s https://shehraz-barbar.digitalmarketingshub.com/version.json   # shows the build that is live
```

`deploy-frontend.sh` needs no Node.js. It checks the build is complete, backs up the files it replaces to `~/backups/shehraz-frontend-<time>.tar.gz`, copies assets and media first and `index.html` last (so no visitor gets a page pointing at a missing bundle), removes only stale files inside `assets/`, and **keeps the live `config.js` and `.htaccess`** (on a first install it creates them; afterwards it only reports if the build's `.htaccess` differs). Nothing else in the web root is touched.

**Rollback:** the deploy prints the exact command, e.g.

```sh
ls -1t ~/backups/shehraz-frontend-*.tar.gz | head -3
sh ~/repositories/barbar/scripts/rollback-frontend.sh ~/backups/shehraz-frontend-YYYYMMDD-HHMMSS.tar.gz ~/shehraz-barbar.digitalmarketingshub.com/public_html
```

Backups include the photos and videos (~22 MB each); delete old ones from `~/backups` now and then.

**Live `config.js`** (in the web root, edit on the server; no rebuild needed):

```js
window.SB_CONFIG = {
  apiBaseUrl: 'https://api.shehraz-barbar.digitalmarketingshub.com/api',
  socketUrl: 'https://api.shehraz-barbar.digitalmarketingshub.com',
};
```

If `apiBaseUrl` points at the website instead of the API, the site's catch-all rewrite answers every API call with `index.html`. The app now shows an error message instead of a blank page and logs `Check apiBaseUrl in /config.js` in the browser console.

### Updating the API
Only needed when `deploy/api/` changed in the pull (`git diff --stat HEAD@{1} -- deploy/api`). Copy `server.js`/`seed.js` into the Node.js app folder, keep its `.env`, then restart the app in *Setup Node.js App* (or `touch tmp/restart.txt` in the app folder). Check `https://api.<domain>/api/health` shows `{"status":"ok","db":"up"}`.

### Real-time updates (Socket.IO) on cPanel
The site connects with a **WebSocket first** and falls back to HTTP long-polling only if the WebSocket cannot be opened; screens also refetch every 30 s and on reconnect, so they never stay stale.

Long-polling keeps a session in the memory of the one Node process that created it. cPanel runs Node apps through Passenger, which can restart an idle app or start a second process. A polling request that lands on a process that doesn't know the session gets **`400 Session ID unknown`** and the client reconnects. WebSocket-first avoids this, because a WebSocket is a single connection. If you ever have to use polling (`socketTransports: ['polling']` in `config.js`, only for hosts that block WebSocket upgrades), ask the host to keep the API app at **one process** or to enable **Passenger sticky sessions** (`PassengerStickySessions on`). Otherwise those 400s will come back under load.

### First install
**Requirements:** Node.js 20+ (cPanel *Setup Node.js App*), **HTTPS** (AutoSSL; login cookies are HTTPS-only in production), and a MongoDB database (MongoDB Atlas; cPanel has no MongoDB).

1. **Database:** create a MongoDB Atlas cluster and a database user. Under *Network Access* allow your host's IP. Copy the `mongodb+srv://…` connection string.
2. **API:** copy `deploy/api/` into a folder **outside** `public_html`. In *Setup Node.js App*: Node 20+, application root = that folder, application URL = `api.yourdomain.com` (create the subdomain first), startup file `server.js`, mode Production. Create `.env` there from `.env.example`: `NODE_ENV=production`, `MONGODB_URI=<Atlas string>`, `CLIENT_ORIGIN=https://yourdomain.com`, two new secrets, `COOKIE_SAMESITE=lax`, and `OWNER_NAME/OWNER_EMAIL/OWNER_PASSWORD`.
3. **Seed once:** run the `seed` script (the app's *Run JS script* button, or `node seed.js`). Then **delete `OWNER_PASSWORD`** from `.env` and restart the app.
4. **Website:** run `scripts/deploy-frontend.sh` as above, then set the API URLs in the new `config.js`.
5. Open `https://yourdomain.com`, sign in at `/login`.

If the hosting has **no** Node.js option, the website can still live on cPanel but the API needs a Node host (e.g. Render) with the same `.env`. Point `config.js` at it and set `COOKIE_SAMESITE=none`.

## Deployment (Render / Vercel)
1. **MongoDB Atlas:** create a cluster, a database user, and allow your backend's IPs. Use the SRV URI as `MONGODB_URI`. Enable continuous/scheduled backups (Atlas Cloud Backup) and test a restore.
2. **Backend (Render, Node web service):** root `server`, build `npm install && npm run build`, start `npm start`, health check `/api/health`. Set the env vars above with `NODE_ENV=production`. Run `npm run seed` once (Render shell, with `OWNER_*` set temporarily).
3. **Frontend (Vercel):** root `client`, build `npm run build`, output `dist`. Set `VITE_API_BASE_URL` and `VITE_SOCKET_URL` to the backend.
4. **Cookies:** easiest is a shared site (e.g. `app.example.com` + `api.example.com`) with `COOKIE_SAMESITE=lax`. For fully separate domains use `COOKIE_SAMESITE=none` (HTTPS required) and set `CLIENT_ORIGIN` to the exact frontend origin. Alternatively rewrite `/api` and `/socket.io` on the frontend host to the backend.
5. Render's free tier sleeps when idle; use a paid instance for a real pilot.

## Business rules & limitations
- Opening hours, address and phone are **blank until the owner enters them**; nothing is invented. The Instagram link defaults to the official profile (https://www.instagram.com/the_shehraz_barber/) and can be changed in Settings.
- Services 4–7 (Beard Trim, Hair Wash, Hair Styling, Face Cleanup) use **demo prices** and show "Demo Price — Confirm with salon". Durations are initial estimates.
- Single salon: counters/indexes are not yet scoped by salon id (the spots to change are commented in code).
- Rate limits are in-memory per server instance; use a shared store if you scale to several instances.
- Not implemented: payment recording (by design: paid in person), scheduled appointments, SMS/WhatsApp notifications, Playwright end-to-end tests.
