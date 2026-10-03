import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

async function load(file, modules) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const exports = {};
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(output, { exports, URL, JSON, Number, Error, SyntaxError, Array, Set, Object, String, RegExp, process, require(name) {
    assert.ok(name in modules, `Unexpected module ${name}`);
    return modules[name];
  } });
  return exports;
}

const input = await load("src/lib/order-input.ts", {});
const userId = "11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";
const validItems = [{ kind: "dish", code: "MV-KV01", quantity: 2 }];
let enabled = false;
let denied = null;
let rpcCalls = 0;
let rpcError = null;
const identityError = class IdentityError extends Error { constructor(status) { super("DENIED"); this.status = status; } };
const route = await load("src/app/api/orders/route.server.ts", {
  "next/server": { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200, headers: options.headers ?? {} }) } },
  "@/lib/identity": { IdentityError: identityError, requireRole: async roles => { assert.deepEqual(Array.from(roles), ["customer"]); if (denied) throw new identityError(denied); return { user: { id: userId } }; } },
  "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ rpc: async (name, args) => { rpcCalls += 1; const expected = args.p_booking_id ? "create_order" : args.p_items ? "update_pending_order" : "cancel_pending_order"; assert.equal(name, expected); return { data: { id: orderId, customer_id: userId, status: "pending", total_amount: 178000, version: 1 }, error: rpcError }; } }) },
  "@/lib/supabase/origin": { getApplicationOrigin: () => "http://127.0.0.1:3002" },
  "@/lib/order": { orderMutationsEnabled: () => enabled, orderError: error => ({ status: error.code === "ORDER_CONFLICT" ? 409 : 503, message: "safe message" }) },
  "@/lib/order-input": input,
});

function request(body, origin = "http://127.0.0.1:3002", contentType = "application/json") {
  return { headers: new Headers({ origin, "content-type": contentType }), text: async () => typeof body === "string" ? body : JSON.stringify(body) };
}
const create = { action: "create", bookingId: orderId, requestId, items: validItems };
assert.equal((await route.POST(request(create))).status, 503);
enabled = true;
assert.equal((await route.POST(request(create, "https://evil.invalid"))).status, 403);
assert.equal((await route.POST(request(create, "http://127.0.0.1:3002", "text/plain"))).status, 415);
assert.equal((await route.POST(request("{bad"))).status, 400);
assert.equal((await route.POST(request("x".repeat(16385)))).status, 413);
for (const status of [401, 403]) { denied = status; assert.equal((await route.POST(request(create))).status, status); }
denied = null;
for (const items of [[], [{ kind: "dish", code: "MV-KV01", quantity: 0 }], [{ kind: "dish", code: "MV-KV01", quantity: 1, price: 1 }]]) assert.equal((await route.POST(request({ ...create, items }))).status, 400);
assert.equal((await route.POST(request({ ...create, action: "update", orderId: undefined, expectedVersion: 1 }))).status, 400);
assert.equal((await route.POST(request({ ...create, action: "cancel", orderId: "bad" }))).status, 400);
const ok = await route.POST(request(create));
assert.equal(ok.status, 200);
assert.equal(ok.headers["Cache-Control"], "private, no-store");
assert.equal(ok.body.order.id, orderId);
assert.equal(ok.body.order.status, "pending");
assert.equal(ok.body.order.totalAmount, 178000);
assert.equal(ok.body.order.version, 1);
assert.equal(JSON.stringify(ok.body).includes("private"), false);
rpcError = { code: "ORDER_CONFLICT", message: "raw" };
const conflict = await route.POST(request(create));
assert.equal(conflict.status, 409);
assert.equal(JSON.stringify(conflict.body).includes("raw"), false);
assert(rpcCalls >= 2);
console.log("PASS order API contract: gate, same-origin, JSON/whitelist validation, role, no-store, safe conflict and customer projection.");
