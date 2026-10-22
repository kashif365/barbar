# Handoff notes (for continuing in a new chat)

Give the new chat this ZIP plus `docs/MASTER_PROJECT_PROMPT.md` (the original spec), and say: "Continue from docs/HANDOFF.md."

## State (updated 2026-10-18, second session)
- Full MERN codebase is written: server (Express/TS/Mongoose/Socket.IO, tests) and client (React/Vite/TS/Tailwind v4). See README.md.
- **Verified:** `npm install` (server + client), server `npm run typecheck`, server `npm run build`, client `npm run build` all pass.
- **One fix made:** `server/src/services/serializers.ts` line 45, cast changed to `as unknown as PopulatedBarber` (TS2352).
- **Added:** Owner audit log page (`/owner/audit`, sidebar entry), reassign + cancel actions on Owner "All tokens", catch-all redirects under `/barber` and `/reception`, README routes table.
- **Added (third session):** owner *Start service* / *Complete service* buttons on `/owner/queue` (QueueDesk). Backend: `startTokenAsAdmin` and role-aware `completeToken` in `queueActions.ts`; routes `start`/`complete` now allow barber + owner; owner actions are audit-logged. 9 new vitest cases in `tests/queue.test.ts` ("owner start / complete") — **written but not yet run**.
- **Fixed (fourth session): "Save settings" did not save the 4 checkboxes.** Cause: in `client/src/pages/owner/OwnerSettings.tsx` the `Check` wrapper component dropped react-hook-form's `ref`, so the booking/hours checkboxes were never registered (toggling only a checkbox left Save disabled; when it was enabled the request sent the *old* checkbox values). Fix: `Check` now uses `forwardRef`. Also: duplicate-submit guard, persistent in-form error banner + toast on failure, and the server now accepts only http(s) `instagramUrl` (was any scheme). Verified in headless Chromium against a mocked API (save, refresh, new session, failures, duplicate submits). New `server/tests/settings.test.ts` (database round trip) is **written but not yet run**.
- **Payments / receipt features (fifth session).** On review, the codebase already contained an implementation of payment tracking (paid/unpaid, void, range reports, dashboard money section) and the black-and-gold token receipt with share/WhatsApp/PNG download (files dated 2026-10-19 15:50-15:57: `Payment.ts`, `paymentService.ts`, `reportService.ts`, `validators`, `routes`, `staffController`, `ownerController`, `serializers`, `TokenReceipt.tsx`, `ReceiptActions.tsx`, `VoidPaymentDialog.tsx`, `useReceiptImage.ts`, `utils/receipt.ts`, plus pages/types/api edits and 6 new payment tests). It was audited, tested and fixed rather than rebuilt. Fixes made: the downloaded PNG now includes the customer's full name; the estimated-wait text no longer wraps on 375 px phones. Documented in README.
- **Verified this session (real runs):** server typecheck, client build; no-database backend checks (anonymous/forged requests to every payment, report, dashboard, queue endpoint -> 401; payment POST without CSRF header -> 403; range validation); 78 browser checks in headless Chromium against a mocked API (booking -> receipt, one booking on double-click, queue-fact rules, native share payload, share fallbacks, WhatsApp encoding, PNG download, 320/375/768/1280 px with no horizontal scroll, dashboard money section, range filters, payment/void dialogs, role visibility, route guards, every page smoke test) + 20 Settings checks.
- **NOT verified (needs MongoDB):** `npm test` (all 70 backend test cases (incl. the 11 payment tests, 9 owner start/complete tests and the settings tests) were never executed), real database save/aggregation behaviour, real Socket.IO updates, real mobile share sheets/WhatsApp app, a real printer.
- **Not verified:** `npm test` (51 tests never executed: the sandbox blocked the MongoDB binary download from fastdl.mongodb.org), and nothing has been run against a real database or in a browser.

## Next steps, in order (no new features until done)
1. On a machine with internet access: `cd server && npm install && npm test`. Fix whatever fails.
2. Create `server/.env`, run `npm run seed` (and optionally `seed:dev`), start both servers.
3. Manual smoke test: book token -> barber call next -> complete -> owner records payment -> reports -> audit log. Include owner reassign/cancel from All tokens. Check 320/375/768/1024/1440 px widths.

## Known caveats
- Demo prices (Beard Trim, Hair Wash, Hair Styling, Face Cleanup) are flagged isDemoPrice=true; confirmed: Haircut 500, Haircut+Beard 750, Facial 500.
- Single salon only; no partial payments/refunds; no Playwright E2E tests; rate limiting is in-memory.
- No real secrets are in this ZIP. Create server/.env from server/.env.example and generate your own SESSION_SECRET and TRACKING_SECRET.
