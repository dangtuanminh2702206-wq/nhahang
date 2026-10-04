import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function load(file, modules, globals = {}) {
  const exports = {};
  const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, JSON, Date, Headers, Error, SyntaxError, ...globals, require: name => { assert.ok(name in modules, name); return modules[name]; } });
  return exports;
}
const id = '11111111-1111-4111-8111-111111111111';
const origin = 'http://127.0.0.1:3000';
const payload = { action: 'booking-delete', id, expectedUpdatedAt: '2026-10-01T10:00:00Z', confirmation: id, reason: 'QA' };
let denied = 0; let calls = 0; let rpcError = null;
class IdentityError extends Error { constructor(status) { super('Denied'); this.status = status; } }
const route = await load('src/app/api/admin/route.server.ts', {
  'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200, headers: options.headers }) } },
  '@/lib/admin': { adminErrorMessage: () => 'Safe error' },
  '@/lib/identity': { IdentityError, requireRole: async roles => { assert.deepEqual(Array.from(roles), ['admin']); if (denied) throw new IdentityError(denied); } },
  '@/lib/supabase/origin': { getApplicationOrigin: () => origin },
  '@/lib/supabase/server': { createSupabaseServerClient: async () => ({ rpc: async (name, args) => { calls++; assert.equal(name, 'admin_delete_booking'); assert.equal(args.p_confirmation, id); assert.equal(args.p_reason, 'QA'); return { data: { deleted: true }, error: rpcError }; } }) },
});
const request = (body, source = origin, type = 'application/json') => ({ headers: new Headers({ origin: source, 'content-type': type }), text: async () => typeof body === 'string' ? body : JSON.stringify(body) });
assert.equal((await route.POST(request(payload, 'https://other.invalid'))).status, 403);
assert.equal((await route.POST(request(payload, origin, 'text/plain'))).status, 415);
for (const status of [401, 403]) { denied = status; assert.equal((await route.POST(request(payload))).status, status); }
denied = 0;
for (const body of [{ ...payload, confirmation: 'wrong' }, { ...payload, reason: '' }, { ...payload, expectedUpdatedAt: 'bad' }, { ...payload, id: 'bad' }, { ...payload, unexpected: true }, '{bad']) assert.equal((await route.POST(request(body))).status, 400);
assert.equal(calls, 0);
const ok = await route.POST(request(payload));
assert.equal(ok.status, 200); assert.equal(ok.headers['Cache-Control'], 'private, no-store');
rpcError = { message: 'PRIVATE INTERNAL', code: 'P0001' };
const conflict = await route.POST(request(payload));
assert.equal(conflict.status, 409); assert.equal(JSON.stringify(conflict.body).includes('PRIVATE'), false);

const states = []; let cursor = 0; let requests = 0; let refreshes = 0;
const jsx = (type, props) => ({ type, props });
const component = await load('src/components/admin-booking-history.tsx', {
  'react': { useState: initial => { const slot = cursor++; if (!(slot in states)) states[slot] = initial; return [states[slot], value => { states[slot] = value; }]; } },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/navigation': { useRouter: () => ({ refresh: () => { refreshes++; } }) },
}, { fetch: async (path, options) => { requests++; assert.equal(path, '/api/admin'); assert.deepEqual(JSON.parse(options.body), payload); return { ok: true, json: async () => ({ ok: true }) }; } });
const bookings = [{ ...payload, updated_at: payload.expectedUpdatedAt, starts_at: payload.expectedUpdatedAt, status: 'cancelled', contact_name: 'QA' }, { id: 'active', status: 'confirmed' }];
function render() { cursor = 0; return component.AdminBookingHistory({ bookings }); }
function elements(node) { if (Array.isArray(node)) return node.flatMap(elements); if (!node || typeof node !== 'object' || !node.props) return []; return [node, ...elements(node.props.children)]; }
const button = label => elements(render()).find(node => node.type === 'button' && node.props.children === label);
assert.equal(elements(render()).filter(node => node.type === 'button').length, 1);
button('Xóa booking này').props.onClick();
assert.equal(requests, 0); assert.equal(button('Xác nhận xóa vĩnh viễn').props.disabled, true);
button('Giữ lại booking').props.onClick(); assert.equal(requests, 0);
button('Xóa booking này').props.onClick();
let fields = elements(render()).filter(node => node.type === 'input');
fields[0].props.onChange({ target: { value: id } }); fields[1].props.onChange({ target: { value: 'QA' } });
assert.equal(button('Xác nhận xóa vĩnh viễn').props.disabled, false);
await elements(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
assert.equal(requests, 1); assert.equal(refreshes, 1);
console.log('PASS booking deletion: API role/origin/whitelist/snapshot/confirmation/no-store and synthetic UI confirmation/cancel. SQL and browser evidence are separate.');
