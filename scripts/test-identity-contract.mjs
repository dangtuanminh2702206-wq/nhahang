import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Mocked application contracts only. No cloud writes or JWT integration claims.
async function load(path, modules, globals = {}) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { ...globals, exports, URL, Error, console: { warn() {} }, require(name) {
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

// Exercise the real Proxy module with synthetic cookies only. This proves cookie
// propagation, not the provider's handling of an expired, signed JWT.
let claimsCalls = 0;
let refreshThrows = false;
const proxyModule = await load('src/proxy.server.ts', {
  '@/lib/supabase/config': modules['@/lib/supabase/config'],
  '@supabase/ssr': { createServerClient: (_url, _key, options) => {
    assert.equal(options.cookieOptions.httpOnly, true);
    assert.equal(options.cookieOptions.sameSite, 'lax');
    assert.equal(options.cookieOptions.secure, true);
    return { auth: { getClaims: async () => {
      claimsCalls++;
      assert.equal(options.cookies.getAll()[0].value, 'synthetic-old-session');
      if (refreshThrows) throw new Error('Synthetic provider unavailable');
      options.cookies.setAll([
        { name: 'qa-session', value: 'synthetic-refreshed-session', options: { httpOnly: true, sameSite: 'lax' } },
        { name: 'qa-stale-chunk', value: '', options: { maxAge: 0 } },
      ], { 'X-QA-Refresh': 'propagated' });
      return { data: { claims: {} }, error: null };
    } } };
  } },
  'next/server': { NextResponse: { next: () => ({ headers: new Map(), cookies: { values: [], set(name, value, options) { this.values.push({ name, value, options }); } } }) } },
}, { process: { env: { NEXT_PUBLIC_SITE_URL: 'https://qa.invalid' } } });
const syntheticCookies = new Map([['qa-session', 'synthetic-old-session']]);
const proxyRequest = { cookies: {
  getAll: () => [...syntheticCookies].map(([name, value]) => ({ name, value })),
  set: (name, value) => syntheticCookies.set(name, value),
} };
result = await proxyModule.default(proxyRequest);
assert.equal(claimsCalls, 1);
assert.equal(syntheticCookies.get('qa-session'), 'synthetic-refreshed-session', 'Downstream request receives refreshed cookie');
assert.equal(result.cookies.values[0].value, 'synthetic-refreshed-session', 'Browser response receives refreshed cookie');
assert.equal(result.cookies.values[0].options.httpOnly, true);
assert.equal(result.cookies.values[1].options.maxAge, 0, 'Stale chunk deletion preserved');
assert.equal(result.headers.get('X-QA-Refresh'), 'propagated', 'SDK refresh headers preserved');
for (const header of ['Cache-Control', 'Pragma', 'Expires']) assert.ok(result.headers.has(header));
assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
syntheticCookies.set('qa-session', 'synthetic-old-session');
refreshThrows = true;
result = await proxyModule.default(proxyRequest);
assert.equal(result.cookies.values.length, 0, 'Failed provider does not fabricate a session');
assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
configured = false;
result = await proxyModule.default(proxyRequest);
assert.equal(claimsCalls, 2, 'Unconfigured Proxy makes no Auth request');
assert.equal(result.cookies.values.length, 0);
console.log('PASS mocked Proxy contracts: refreshed request/response cookies, stale chunks, SDK headers, no-store, transport failure and unconfigured mode.');
console.log('NOT JWT integration: no real signup callback, inactive or Staff/Admin account tested here.');
