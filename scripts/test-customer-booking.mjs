import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function load(path, modules = {}, env = {}) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  let js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, process: { env }, URL, Headers, JSON, Error, Array, Date, console, require(name) { if (!(name in modules)) throw new Error(`Unexpected module ${name}`); return modules[name]; } });
  return exports;
}

class IdentityError extends Error { constructor(status) { super("DENIED"); this.status = status; } }
const bookingId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const origin = "http://127.0.0.1:3002";
const env = { BOOKING_LOCAL_MUTATIONS_ENABLED: "true", NEXT_PUBLIC_SITE_URL: origin, BOOKING_ALLOWED_SUPABASE_PROJECT_REF: "ojnkruytzhfqathvlexh" };
const booking = await load("src/lib/booking.ts", { "server-only": {}, "@/lib/supabase/config": { getSupabaseConfig: () => ({ url: "https://ojnkruytzhfqathvlexh.supabase.co", key: "public-test" }) } }, env);
let denied = 0;
let rpcError = null;
let updateCalled = false;
const modules = {
  "next/server": { NextResponse: { json: (body, options) => ({ body, ...options }) } },
  "@/lib/booking": { ...booking, bookingMutationsEnabled: () => true },
  "@/lib/identity": { IdentityError, requireRole: async () => { if (denied) throw new IdentityError(denied); return { user: { id: userId } }; } },
  "@/lib/supabase/origin": { getApplicationOrigin: () => origin },
  "@/lib/supabase/server": { createSupabaseServerClient: async () => ({
    rpc: async (name, args) => { assert.equal(name, "cancel_booking"); assert.equal(args.p_id, bookingId); return { data: rpcError ? null : { id: bookingId, customer_id: userId, status: "cancelled", cancellation_source: "customer", reason: "customer_cancelled" }, error: rpcError }; },
    from: () => ({ update: (values) => { updateCalled = true; assert.equal(typeof values.read_at, "string"); return { eq: function () { return this; }, select: function () { return this; }, maybeSingle: async () => ({ data: { id: "n1", read_at: values.read_at }, error: null }) }; } }),
  }) },
};
const cancelRoute = await load("src/app/api/bookings/[id]/cancel/route.server.ts", modules, env);
function request(requestOrigin = origin) { return { headers: new Headers({ origin: requestOrigin, "content-type": "application/json" }) }; }
assert.equal((await cancelRoute.POST(request("https://attacker.invalid"), { params: Promise.resolve({ id: bookingId }) })).status, 403);
assert.equal((await cancelRoute.POST(request(), { params: Promise.resolve({ id: "bad" }) })).status, 400);
for (const status of [401, 403, 503]) { denied = status; assert.equal((await cancelRoute.POST(request(), { params: Promise.resolve({ id: bookingId }) })).status, status); }
denied = 0;
const successResponse = await cancelRoute.POST(request(), { params: Promise.resolve({ id: bookingId }) });
assert.equal(successResponse.body?.booking?.status, "cancelled", JSON.stringify(successResponse));
rpcError = { message: "CANCELLATION_WINDOW" };
assert.equal((await cancelRoute.POST(request(), { params: Promise.resolve({ id: bookingId }) })).status, 409);
rpcError = { message: "BOOKING_NOT_FOUND" };
assert.equal((await cancelRoute.POST(request(), { params: Promise.resolve({ id: bookingId }) })).status, 404);
console.log("PASS cancel route: same-origin, Customer authorization, projection, cancellation-window and ownership-safe errors.");

const notificationRoute = await load("src/app/api/notifications/[id]/route.server.ts", modules, env);
function notificationRequest(requestOrigin = origin, contentType = "application/json") { return { headers: new Headers({ origin: requestOrigin, "content-type": contentType }) }; }
assert.equal((await notificationRoute.PATCH(notificationRequest("https://attacker.invalid"), { params: Promise.resolve({ id: bookingId }) })).status, 403);
assert.equal((await notificationRoute.PATCH(notificationRequest(origin, "text/plain"), { params: Promise.resolve({ id: bookingId }) })).status, 415);
assert.equal((await notificationRoute.PATCH(notificationRequest(), { params: Promise.resolve({ id: "bad" }) })).status, 400);
assert.equal((await notificationRoute.PATCH(notificationRequest(), { params: Promise.resolve({ id: bookingId }) })).body.notification.id, "n1");
assert(updateCalled, "notification update should be scoped to the recipient");
console.log("PASS notification route: same-origin, Customer authorization, valid update projection and read_at mutation path.");

const migration = await readFile(new URL("../supabase/migrations/202610020001_customer_booking_management.sql", import.meta.url), "utf8");
assert(migration.includes("perform private.lock_booking_writes()"));
assert(migration.includes("v_result.starts_at - v_now < make_interval(mins => v_policy.cancellation_minutes)"));
assert(migration.includes("reason = 'customer_cancelled'"));
assert(migration.includes("perform private.record_booking_event"));
assert(migration.includes("b.customer_id = auth.uid()"));
assert(migration.includes("grant execute on function public.cancel_booking(uuid) to authenticated"));
console.log("PASS migration contract: inclusive database cancellation boundary, lock, atomic event recording, Customer-only history RLS and grant.");
