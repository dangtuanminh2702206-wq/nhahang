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
assert.ok(proxyModule.config.matcher.includes('/admin/:path*'));
assert.ok(proxyModule.config.matcher.includes('/api/admin/:path*'));
console.log('NOT JWT integration: no real signup callback, inactive or Staff/Admin account tested here.');

// Password recovery contracts run against the actual handlers with an isolated provider mock.
configured = true;
user = { id: 'customer-qa', email_confirmed_at: 'confirmed' };
profile = { id: user.id, role: 'customer', is_active: true };
let recoveryError = null;
let updateError = null;
let logoutError = null;
let recoveryCalls = 0;
let passwordCalls = 0;
let logoutScope = null;
client.auth.resetPasswordForEmail = async (email, options) => {
  recoveryCalls++;
  assert.ok(['qa@example.invalid', 'missing@example.invalid'].includes(email));
  assert.equal(options.redirectTo, `${origin}/auth/recovery`);
  return { error: recoveryError };
};
client.auth.updateUser = async fields => {
  passwordCalls++;
  assert.deepEqual(Object.keys(fields), ['password']);
  return { error: updateError };
};
client.auth.signOut = async fields => { logoutScope = fields.scope; return { error: logoutError }; };
const passwordRoute = await load('src/app/auth/password/route.server.ts', {
  ...modules,
  'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
  '@/lib/identity': identity,
  '@/lib/supabase/origin': { getApplicationOrigin: () => origin },
});
const passwordRequest = (fields, overrides = {}) => ({
  headers: new Map([['origin', origin], ['content-type', 'application/json']]),
  text: async () => JSON.stringify(fields), ...overrides,
});
result = await passwordRoute.POST(passwordRequest({ action: 'forgot-password', email: 'qa@example.invalid' }, { headers: new Map([['origin', 'https://attacker.invalid'], ['content-type', 'application/json']]) }));
assert.equal(result.status, 403);
assert.equal(recoveryCalls, 0);
for (const contentType of ['application/x-www-form-urlencoded', 'application/jsonp', 'text/plain']) {
  result = await passwordRoute.POST(passwordRequest({ action: 'forgot-password', email: 'qa@example.invalid' }, { headers: new Map([['origin', origin], ['content-type', contentType]]) }));
  assert.equal(result.status, 403);
}
assert.equal(recoveryCalls, 0);
for (const fields of [null, [], { action: 'forgot-password', email: 'not-an-email' }, { action: 'forgot-password', email: 'qa@example.invalid', redirectTo: 'https://attacker.invalid' }, { action: 'reset-password', password: 'synthetic-password', password_confirmation: 'different' }, { action: 'reset-password', password: 'synthetic-password', password_confirmation: 'synthetic-password', user_id: 'other' }]) {
  result = await passwordRoute.POST(passwordRequest(fields));
  assert.equal(result.status, 400);
}
assert.equal(passwordCalls, 0);
result = await passwordRoute.POST(passwordRequest({}, { text: async () => 'x'.repeat(2049) }));
assert.equal(result.status, 413);
result = await passwordRoute.POST(passwordRequest({}, { text: async () => '{' }));
assert.equal(result.status, 400);
const existing = await passwordRoute.POST(passwordRequest({ action: 'forgot-password', email: 'qa@example.invalid' }));
recoveryError = { status: 400, code: 'email_not_found' };
const missing = await passwordRoute.POST(passwordRequest({ action: 'forgot-password', email: 'missing@example.invalid' }));
assert.equal(existing.status, missing.status);
assert.equal(existing.body.message, missing.body.message, 'Email membership must not be exposed');
assert.equal(existing.headers['Cache-Control'], 'private, no-store');
recoveryError = { status: 429 };
assert.equal((await passwordRoute.POST(passwordRequest({ action: 'forgot-password', email: 'qa@example.invalid' }))).status, 429);
recoveryError = { status: 500 };
assert.equal((await passwordRoute.POST(passwordRequest({ action: 'forgot-password', email: 'qa@example.invalid' }))).status, 503);
const change = { action: 'reset-password', password: 'synthetic-password', password_confirmation: 'synthetic-password' };
user = null;
assert.equal((await passwordRoute.POST(passwordRequest(change))).status, 401);
user = { id: 'customer-qa', email_confirmed_at: 'confirmed' };
profile.is_active = false;
assert.equal((await passwordRoute.POST(passwordRequest(change))).status, 403);
profile.is_active = true;
assert.equal(passwordCalls, 0, 'Unauthenticated/inactive callers cannot change a password');
result = await passwordRoute.POST(passwordRequest(change));
assert.equal(result.body.redirect, '/login?password=updated');
assert.equal(logoutScope, 'global');
logoutError = { status: 503 };
result = await passwordRoute.POST(passwordRequest(change));
assert.equal(result.body.updated, true, 'Logout failure must not conceal a successful password update');
assert.equal(result.body.redirect, undefined);
updateError = { status: 422 };
assert.equal((await passwordRoute.POST(passwordRequest(change))).status, 400);
configured = false;
assert.equal((await passwordRoute.POST(passwordRequest(change))).status, 503);

configured = true;
logoutError = null;
const recoveryRoute = await load('src/app/auth/recovery/route.server.ts', {
  ...modules,
  'next/server': { NextResponse: { redirect: (url, options) => ({ url, ...options }) } },
  '@/lib/supabase/origin': { getApplicationOrigin: () => origin },
});
result = await recoveryRoute.GET(request('code=qa-code&next=https://attacker.invalid'));
assert.equal(result.url.href, `${origin}/reset-password`);
assert.equal(result.headers['Referrer-Policy'], 'no-referrer');
result = await recoveryRoute.GET(request('token_hash=qa-token-hash&type=recovery'));
assert.equal(result.url.pathname, '/reset-password');
for (const query of ['', 'token_hash=qa-token-hash&type=signup', 'error=access_denied&error_code=otp_expired']) {
  result = await recoveryRoute.GET(request(query));
  assert.equal(result.url.pathname, '/forgot-password');
  assert.equal(result.url.searchParams.get('recovery'), 'failed');
}
profile.is_active = false;
assert.equal((await recoveryRoute.GET(request('code=qa-code'))).url.pathname, '/forgot-password');
assert.equal(logoutScope, 'local');
profile = { id: 'other', is_active: true, role: 'customer' };
assert.equal((await recoveryRoute.GET(request('code=qa-code'))).url.pathname, '/forgot-password');
client.auth.exchangeCodeForSession = async () => ({ data: { user: null }, error: { code: 'otp_expired' } });
assert.equal((await recoveryRoute.GET(request('code=qa-code'))).url.searchParams.get('reason'), 'expired');
for (const [code, expected] of [['pkce_code_verifier_not_found','browser'],['bad_code_verifier','browser'],['flow_state_not_found','expired'],['unmapped_provider_error','service']]) {
  client.auth.exchangeCodeForSession = async () => ({ data: {user:null}, error: {code,message:'PRIVATE_DO_NOT_REFLECT'} });
  const failed = await recoveryRoute.GET(request('code=qa-code'));
  assert.equal(failed.url.searchParams.get('reason'),expected);
  assert.equal(failed.url.href.includes('PRIVATE_DO_NOT_REFLECT'),false);
}
console.log('PASS password contracts: origin/content whitelist, input bounds, enumeration response, quota, verified active ownership, update/logout failure, global logout, PKCE/recovery OTP, expired links and fixed redirects.');
console.log('NOT RUN here: provider email delivery, real recovery cookies or production password update.');
const profilePageSource = await readFile(new URL('../src/app/profile/page.tsx', import.meta.url), 'utf8');
assert.match(profilePageSource, /<Link\b[^>]*href="\/reset-password"[^>]*>Đổi mật khẩu<\/Link>/);
console.log('PASS profile navigation source contract: visible change-password link targets existing reset-password route.');
