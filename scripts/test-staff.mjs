import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

async function load(path, modules = {}) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, process: { env: {} }, URL, Headers, JSON, Error, Array, Date, Number, crypto: { randomUUID: () => "33333333-3333-4333-8333-333333333333" }, console, require(name) { if (!(name in modules)) throw new Error(`Unexpected module ${name}`); return modules[name]; } });
  return exports;
}

class IdentityError extends Error { constructor(status) { super("DENIED"); this.status = status; } }
const origin = "http://127.0.0.1:3002";
const bookingId = "11111111-1111-4111-8111-111111111111";
const tableId = "22222222-2222-4222-8222-222222222222";
let mutationsEnabled = true; let denied = 0; let lastRpc = null;
const modules = {
  "next/server": { NextResponse: { json: (body, options) => ({ body, ...options }) } },
  "@/lib/identity": { IdentityError, requireRole: async roles => { assert.deepEqual(Array.from(roles), ["staff", "admin"]); if (denied) throw new IdentityError(denied); return { user: { id: "staff-user" } }; } },
  "@/lib/supabase/origin": { getApplicationOrigin: () => origin },
  "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ rpc: async (name, args) => { lastRpc = { name, args }; return { data: { id: bookingId, status: "confirmed" }, error: null }; } }) },
  "@/lib/booking": { bookingMutationsEnabled: () => mutationsEnabled, bookingError: error => ({ status: error.code === "42501" ? 403 : 409, message: "Booking thao tác không hợp lệ." }) },
};
const actionRoute = await load("src/app/api/staff/bookings/action/route.server.ts", modules);
function request(body = {}, requestOrigin = origin, contentType = "application/json") { return { headers: new Headers({ origin: requestOrigin, "content-type": contentType }), text: async () => typeof body === "string" ? body : JSON.stringify(body) }; }
assert.equal((await actionRoute.POST(request({}, "https://attacker.invalid"))).status, 403);
assert.equal((await actionRoute.POST(request({}, origin, "text/plain"))).status, 415);
for (const status of [401, 403, 503]) { denied = status; assert.equal((await actionRoute.POST(request({ requestId: tableId, id: bookingId, action: "confirm" }))).status, status); }
denied = 0;
assert.equal((await actionRoute.POST(request({ requestId: tableId, id: bookingId, action: "reject" }))).status, 400);
assert.equal((await actionRoute.POST(request({ requestId: tableId, id: bookingId, action: "confirm" }))).body.bookingId, bookingId);
assert.equal(lastRpc.name, "staff_operation"); assert.equal(lastRpc.args.p_action, "confirm");
assert.equal((await actionRoute.POST(request({ requestId: tableId, id: bookingId, action: "move", newTableId: tableId, guestConsent: true, reason: "Khu khách yêu cầu" }))).body.bookingId, bookingId);
assert.equal(lastRpc.name, "staff_operation"); assert.equal(lastRpc.args.p_table_id, tableId);
console.log("PASS Staff action route: origin, content type, role authorization, reason validation and RPC projection.");

const createRoute = await load("src/app/api/staff/bookings/create/route.server.ts", modules);
const createBody = { idempotencyKey: bookingId, tableId, source: "phone", startsAt: "2026-10-04T18:00:00+07:00", guestCount: 2, name: "QA Staff", phone: "TEST-PHONE", notes: "PHASE7 QA" };
assert.equal((await createRoute.POST(request(createBody))).body.status, "confirmed");
assert.equal(lastRpc.name, "create_booking"); assert.equal(lastRpc.args.p_source, "phone"); assert.equal(lastRpc.args.p_customer_id, null);
assert.equal(lastRpc.args.p_idempotency_key, bookingId);
await createRoute.POST(request(createBody)); assert.equal(lastRpc.args.p_idempotency_key, bookingId);
mutationsEnabled = false;
assert.equal((await createRoute.POST(request(createBody))).status, 503);
assert.equal((await actionRoute.POST(request({ requestId: tableId, id: bookingId, action: "confirm" }))).status, 503);
mutationsEnabled = true;
assert.equal((await createRoute.POST(request({ ...createBody, idempotencyKey: undefined }))).status, 400);
console.log("PASS Staff create route: only phone/walk-in source, role authorization and no customer spoofing.");

const migration = await readFile(new URL("../supabase/migrations/202610030001_staff_operations.sql", import.meta.url), "utf8");
for (const marker of ["staff_update_booking", "staff_move_booking", "staff_mark_table_ready", "actual_guest_count", "checked_in_at", "completed_at", "STAFF_REQUIRED", "REASON_REQUIRED", "grant execute on function public.staff_update_booking"]) assert(migration.includes(marker), marker);
console.log("PASS Staff migration contract: state transitions, physical table state, audit/event path and grants.");

const panel = await readFile(new URL("../src/components/staff-action-panel.tsx", import.meta.url), "utf8");
assert(!panel.includes('window.confirm'));
for (const marker of ['setConfirmation(action)', 'run(confirmation, true)', 'cancelButton.current?.focus()', 'event.key === "Escape"', 'disabled={!!pending || !!confirmation}', 'role="group"', 'role="alert"']) assert(panel.includes(marker), marker);
console.log("PASS Staff confirmation source contract: explicit approval, locked inputs, cancel focus and Escape; browser interaction still requires live QA.");
