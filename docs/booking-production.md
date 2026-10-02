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
- Production deploy and real booking HTTP/JWT/UI tests: pending verification.
- Comprehensive integration acceptance remains PARTIAL until the remaining
  checks have actual results. Historic mock/SQL tests are not live JWT evidence.

Secrets, cookies, passwords, backup folders and 3D artifacts must not be committed.
Earlier Auth/3D worktree changes are outside this deployment commit.
