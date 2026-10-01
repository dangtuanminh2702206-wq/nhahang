import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Mocked application contracts only. No cloud writes or JWT integration claims.
async function load(path, modules) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, URL, Error, console: { warn() {} }, require(name) {
    assert.ok(name in modules, `Unexpected module: ${name}`);
    return modules[name];
  } });
  return exports;
}
let configured = true;
let user = { id: 'customer-qa', email_confirmed_at: 'confirmed', user_metadata: { role: 'admin' } };
let profile = { id: user.id, full_name: 'QA', phone: null, role: 'customer', is_active: true };
const client = { auth: { getUser: async () => ({ data: { user }, error: null }) }, from(table) {
  assert.equal(table, 'profiles');
  return { select: () => ({ eq: (_column, id) => {
    assert.equal(id, user.id);
    return { maybeSingle: async () => ({ data: profile, error: null }) };
  } }) };
} };
const modules = {
  'server-only': {}, react: { cache: fn => fn },
  '@/lib/supabase/server': { createSupabaseServerClient: async () => client },
  '@/lib/supabase/config': { getSupabaseConfig: () => configured ? { url: 'QA', key: 'QA' } : null },
};
const identity = await load('src/lib/identity.ts', modules);
const denied = (operation, status) => assert.rejects(operation, error => error instanceof identity.IdentityError && error.status === status);
await denied(() => identity.requireRole(['admin']), 403);
assert.equal((await identity.requireRole(['customer'])).profile.role, 'customer');
for (const role of ['customer', 'staff', 'admin']) {
  profile = { ...profile, role };
  for (const allowed of ['customer', 'staff', 'admin']) {
    if (role === allowed) assert.equal((await identity.requireRole([allowed])).profile.role, role);
    else await denied(() => identity.requireRole([allowed]), 403);
  }
}
profile = { ...profile, is_active: false };
await denied(identity.requireActiveUser, 403);
profile = null;
await denied(identity.requireActiveUser, 403);
profile = { id: 'other-user', role: 'admin', is_active: true };
await denied(identity.requireActiveUser, 403);
user = { ...user, email_confirmed_at: null };
await denied(identity.requireAuthenticatedUser, 401);
configured = false;
await denied(identity.requireAuthenticatedUser, 503);
console.log('PASS mocked identity contracts: metadata ignored / role matrix / inactive / missing / foreign profile / unconfirmed / unconfigured.');

const origin = 'http://127.0.0.1:3002';
configured = true;
user = { id: 'customer-qa', email_confirmed_at: 'confirmed' };
profile = { id: user.id, role: 'customer', is_active: true };
let signedOut = 0;
let otpCalls = 0;
client.auth.exchangeCodeForSession = async code => {
  assert.equal(code, 'qa-code');
  return { data: { user }, error: null };
};
client.auth.verifyOtp = async fields => {
  otpCalls++;
  assert.equal(fields.token_hash, 'qa-token-hash');
  return { data: { user }, error: null };
};
client.auth.signOut = async fields => { assert.equal(fields.scope, 'local'); signedOut++; return { error: null }; };
const callback = await load('src/app/auth/confirm/route.server.ts', {
  ...modules,
  'next/server': { NextResponse: { redirect: (url, options) => ({ url, ...options }) } },
  '@/lib/supabase/origin': { getApplicationOrigin: () => origin },
});
const request = query => ({ nextUrl: new URL(`/auth/confirm?${query}`, origin) });
let result = await callback.GET(request('code=qa-code&next=https://attacker.invalid'));
assert.equal(result.url.href, `${origin}/profile`);
assert.equal(result.headers['Cache-Control'], 'private, no-store');
assert.equal(result.headers['Referrer-Policy'], 'no-referrer');
for (const type of ['signup', 'email']) {
  result = await callback.GET(request(`token_hash=qa-token-hash&type=${type}`));
  assert.equal(result.url.pathname, '/profile');
}
result = await callback.GET(request('token_hash=qa-token-hash&type=recovery'));
assert.equal(result.url.pathname, '/login');
assert.equal(otpCalls, 2);
profile.is_active = false;
result = await callback.GET(request('code=qa-code'));
assert.equal(result.url.pathname, '/login');
assert.equal(signedOut, 1);
console.log('PASS mocked callback contracts: PKCE / supported OTP / fixed redirect / no-store / inactive denied.');
console.log('NOT JWT integration: no real signup callback, inactive or Staff/Admin account tested here.');
