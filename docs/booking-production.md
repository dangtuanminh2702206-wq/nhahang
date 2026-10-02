# Phase 5 production acceptance — 2026-10-02

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
- Staff workflow, scheduler, cancellation and notifications are later phases.

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
- Two-Customer race/isolation runner is prepared but not PASS yet: the local
  QA form still has not received the second Customer credential, so no pair
  result is claimed. No credential is inferred or printed.
- Database integration test script was not run because no test database URL is
  configured; production live checks above used the approved Supabase project.

Comprehensive integration acceptance is PARTIAL until the two-Customer race /
cross-customer isolation result is captured. Historic mock/SQL tests are not
live JWT evidence.

Secrets, cookies, passwords, backup folders and 3D artifacts must not be committed.
Earlier Auth/3D worktree changes are outside this deployment commit.
