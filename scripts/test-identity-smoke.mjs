import assert from 'node:assert/strict';

// HTTP/configuration checks only. This is NOT a Supabase Auth/JWT integration suite.
const base = new URL(process.env.IDENTITY_SMOKE_URL || 'http://127.0.0.1:3002');
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('Loopback test server required');
for (const route of ['/', '/login', '/signup', '/profile', '/menu', '/spaces', '/spaces/floor-1', '/spaces/floor-2', '/spaces/floor-3', '/contact', '/reservation']) {
  const response = await fetch(new URL(route, base), { redirect: 'manual' });
  assert.ok([200, 307].includes(response.status), `${route}: unexpected HTTP ${response.status}`);
}
const crossSite = await fetch(new URL('/auth/session', base), {
  method: 'POST', headers: { Origin: 'https://untrusted.invalid', 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'logout' }),
});
assert.equal(crossSite.status, 403, 'cross-origin mutations must fail');
const formPost = await fetch(new URL('/auth/session', base), {
  method: 'POST', headers: { Origin: base.origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'action=logout',
});
assert.equal(formPost.status, 403, 'cross-site form-compatible content types must fail');
const callback = await fetch(new URL('/auth/confirm?next=https://untrusted.invalid', base), { redirect: 'manual' });
assert.equal(callback.status, 307);
const destination = new URL(callback.headers.get('location'), base);
assert.equal(destination.origin, base.origin);
assert.equal(destination.pathname, '/login');
const session = await fetch(new URL('/auth/session', base));
assert.match(session.headers.get('cache-control'), /no-store/);
assert.equal((await session.json()).authenticated, false);
console.log('PASS: public/identity HTTP smoke, CSRF rejection, safe callback and no-store guest session');
console.log('NOT RUN: real signup, email confirmation, login/logout, refresh, JWT/RLS and role accounts');
