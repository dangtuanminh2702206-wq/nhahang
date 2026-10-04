# Phase 5 production acceptance — 2026-10-02

This document preserves acceptance evidence from the dated booking rollout.
It is not the current feature list. Staff/Admin, scheduler and ordering were
implemented and accepted in later phases; see academic-handover.md and
database-testing.md for current school scope and latest results.

Operator explicitly authorized deployment and test bookings on the existing
production application/database. This supersedes the earlier local-only limit.

## Scope

- Application: https://moc-vi-restaurant.vercel.app
- Supabase project: `unhybmmbgumyhzaftlli`.
- Preflight: 0 bookings, 8 profiles, 22 tables / 92 seats; existing create RPC.
- Applied only `202610010001_availability.sql` using SQL Editor: success.
- No seed, reset, account promotion, SMTP changes, or RLS removal.
- Server opt-in: `BOOKING_MUTATIONS_ENABLED=true` plus matching approved origin
  and `BOOKING_ALLOWED_SUPABASE_PROJECT_REF`. Local flag alone cannot enable it.
- Customer active + same-origin JSON POST required; verified user session calls
  transactional RPC. Browser cannot choose role/customer/source. No service key.
- Lookup is not a hold; creation is pending, not restaurant confirmation.
- Pages remains a static demo without booking APIs.
- Staff workflow, scheduler, email/SMS and payment are later phases; Customer
  cancellation and in-site notifications are covered in Phase 6 below.

## Evidence

- Customer login on production: PASS (existing supplied account, no new signup).
- Typecheck / lint / handler contract tests: PASS.
- Pages build and 450 asset/link references: PASS; API routes excluded.
- Normal build: PASS (Next.js dynamic availability/booking routes included).
- Production deployment: PASS on Vercel with the approved project gate.
- Customer live HTTP/JWT checks: PASS for guest availability projection, origin
  and role enforcement, transactional pending creation, idempotent retry,
  occupied-table conflict, business-hours validation, own-booking RLS and
  booking history.
- Staff live checks: PASS for trusted active role, public availability and
  denial of the Customer endpoint and website RPC.
- Admin live checks: PASS for trusted active role, catalogue totals and exactly
  one creation audit per scoped Phase 5 test booking.
- Production reservation UI: PASS for authenticated lookup, floor/table
  selection and clear unavailable-time validation. Responsive QA passed at
  320/704/1024/1600px without horizontal overflow.
- Local HTTP smoke: PASS with mutations disabled, CSRF/origin enforcement and
  availability validation. Normal build, Pages build, typecheck and lint: PASS.
- Two-Customer live runner: PASS on 2026-10-02 through production HTTP and real
  Customer JWTs. Both trusted profiles were active and distinct. Concurrent
  same-table requests returned exactly one pending booking and one safe 409.
- Bidirectional booking/history/notification read isolation: PASS. Ownership
  and website source matched the verified caller; direct RPC rejected a foreign
  customer ID and phone/walk_in source forgery. Guest could not read bookings.
- Retry returned the same booking ID without duplicate history or notifications;
  the held table was excluded from subsequent public availability. PASS.
- Pair runner returned COMPLETE; two labelled pending test bookings were
  retained. Test sessions logged out; credentials were not saved or printed.
- Local QA form transport: PASS for fresh forms, opaque embedded-browser Origin
  with valid CSRF, stale-token rejection and foreign-website Origin rejection.
  This compatibility change affects only the loopback harness, not application
  API origin enforcement.
- Database integration test script was not run because no test database URL is
  configured; production live checks above used the approved Supabase project.

Phase 5 is PASS within the agreed Customer booking scope, combining the live
production results above and the existing SQL/handler/UI/build checks. Staff
operations and scheduler remain later phases.

Secrets, cookies, passwords, backup folders and 3D artifacts must not be committed.
Earlier Auth/3D worktree changes are outside this deployment commit.

## Phase 6 implementation status — 2026-10-02

- Migration `202610020001_customer_booking_management.sql` was applied in the
  same production project after review. SQL Editor returned success with no rows.
- Customer cancellation is database-authoritative: only the booking owner with
  an active Customer profile can cancel pending/confirmed bookings; exactly 60
  minutes is allowed, the write is locked, and history/notification/audit are
  recorded atomically. Repeating a cancelled request is a no-op.
- Customer UI/API is implemented at `/my-bookings`, `/my-bookings/[id]`,
  `POST /api/bookings/[id]/cancel` and `PATCH /api/notifications/[id]`.
  Staff/Admin operational screens, scheduler, email/SMS and payment remain out
  of scope.
- Customer-only ownership, same-origin, route projection and migration contract
  tests PASS. Normal build, Pages build and static artifact checks PASS.
- Live production UI cancellation: PASS on 2026-10-02 with the explicitly
  identified QA booking `Phase 5 pair QA`. The detail page showed `Đã hủy`,
  history recorded `customer_cancelled` by the Customer, and the Customer
  notification `Đặt bàn của bạn đã được hủy.` appeared in `/my-bookings`.
- Exact SQL boundary and concurrent-race evidence: PASS in clean local PostgreSQL
  fixture (35 checks, including independently locked cancel/cancel, cancel/confirm,
  cancel/expire connections and atomic rollback). This is database integration,
  not live JWT boundary testing.
- Follow-up migration `202610020002_customer_cancellation_expiry.sql` applied
  successfully to production; expired owned pending targets return system expiry
  rather than recording Customer cancellation. Production notification read_at PASS.
- Phase 6 accepted: typecheck/lint, Pages and normal build, local HTTP smoke PASS.
  Vercel production deployment for `36f8288` is Ready and assigned to
  `moc-vi-restaurant.vercel.app`; list/detail serve the new booking ID and
  translated history. Responsive 320/704/1024/1600px has no horizontal overflow;
  no console errors in the observed Customer flow. Read notification persists
  after reload. Boundary/race/rollback evidence is local PostgreSQL integration,
  while Customer cancellation and notification UI evidence is live production.

Secrets, cookies, passwords, backup folders and 3D artifacts must not be committed.
