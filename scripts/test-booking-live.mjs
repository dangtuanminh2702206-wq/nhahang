import assert from 'node:assert/strict';
import { createInterface } from 'node:readline/promises';
import { randomUUID } from 'node:crypto';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';

// Explicitly authorized production QA. Creates pending test bookings, never deletes data.
// Passwords, cookies and JWTs stay in memory; output contains only test labels.
assert(process.stdin.isTTY, 'Interactive terminal required');
process.loadEnvFile('.env.local');
const site = 'https://moc-vi-restaurant.vercel.app';
const supabaseUrl = 'https://unhybmmbgumyhzaftlli.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert(key && !key.startsWith('sb_secret_'), 'Public key required');
if (!key.startsWith('sb_publishable_')) {
  assert.equal(JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role, 'anon');
}
const input = createInterface({ input: process.stdin, output: process.stdout });
const expectedRole = process.argv.find(value => value.startsWith('--role='))?.split('=')[1] || 'customer';
assert(['customer', 'staff', 'admin'].includes(expectedRole));
const email = (await input.question(`Existing ${expectedRole} email: `)).trim();
input.close();
process.stdout.write('Existing password (hidden): ');
let password = await new Promise((resolve, reject) => {
  let value = '';
  const raw = process.stdin.isRaw;
  const cleanup = () => { process.stdin.off('data', onData); process.stdin.setRawMode(raw); process.stdin.pause(); process.stdout.write('\n'); };
  const onData = chunk => {
    for (const character of chunk.toString()) {
      if (character === '\u0003') { cleanup(); reject(new Error('Cancelled')); return; }
      if (character === '\r' || character === '\n') { cleanup(); resolve(value); return; }
      if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
      else if (character >= ' ') value += character;
    }
  };
  process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.on('data', onData);
});
let cookies = '';
const pass = name => console.log(`PASS ${name}`);
async function request(path, body, authenticated = true, origin = site) {
  const headers = { origin, ...(authenticated ? { cookie: cookies } : {}) };
  if (body !== undefined) headers['content-type'] = 'application/json';
  return fetch(site + path, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
}
try {
  const login = await request('/auth/session', { action: 'login', email, password }, false);
  password = '';
  assert.equal(login.status, 200, 'Real Customer login');
  cookies = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert(cookies, 'Session cookies returned');
  const client = createServerClient(supabaseUrl, key, {
    cookies: { getAll: () => parseCookieHeader(cookies).filter(item => typeof item.value === 'string'), setAll: () => {} },
  });
  const { data: identity, error: identityError } = await client.auth.getUser();
  assert.equal(identityError, null, 'Verified Auth JWT');
  const { data: profile, error: profileError } = await client.from('profiles').select('role,is_active').eq('id', identity.user.id).single();
  assert.equal(profileError, null); assert.equal(profile.role, expectedRole); assert(profile.is_active);
  pass(`real ${expectedRole} JWT / active trusted profile`);
  const day = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const startsAt = `${day}T18:00:00+07:00`;
  const query = '/api/availability?' + new URLSearchParams({ startsAt, guests: '2' });
  const availability = await request(query, undefined, false);
  assert.equal(availability.status, 200);
  const tables = (await availability.json()).tables;
  assert(tables.length > 0, 'Available real table required');
  assert.deepEqual(Object.keys(tables[0]).sort(), ['area_code', 'capacity', 'table_code', 'table_id']);
  assert(availability.headers.get('cache-control').includes('no-store'));
  pass('Guest availability / four-field projection / no-store');
  const payload = { startsAt, guests: 2, tableId: tables[0].table_id, idempotencyKey: randomUUID(), name: 'Phase 5 production QA', phone: '0900000000', notes: 'TEST ONLY — operator-approved Phase 5 QA; not a real visit.' };
  if (expectedRole !== 'customer') {
    assert.equal((await request('/api/bookings', payload)).status, 403);
    pass(`${expectedRole} cannot use the Customer website booking endpoint`);
    const denied = await client.rpc('create_booking', {p_idempotency_key:randomUUID(),p_table_id:payload.tableId,p_starts_at:startsAt,p_guest_count:2,p_contact_name:payload.name,p_contact_phone:payload.phone,p_source:'website'});
    assert(denied.error, 'Database website booking must also reject non-Customer');
    pass(`${expectedRole} direct website RPC denied`);
    if (expectedRole === 'admin') {
      for (const [relation, count] of [['areas',3],['tables',22],['menu_categories',6],['menu_items',30],['business_hours',7]]) {
        const result = await client.from(relation).select(relation === 'business_hours' ? 'weekday' : 'id',{count:'exact',head:true});
        assert.equal(result.error,null); assert.equal(result.count,count);
      }
      const seats=await client.from('tables').select('capacity'); assert.equal(seats.error,null);
      assert.equal(seats.data.reduce((sum,table)=>sum+table.capacity,0),92);
      pass('production catalogue 3 floors / 22 tables / 92 seats / 6 categories / 30 dishes / 7 business hours');
      const testRows=await client.from('bookings').select('id').in('contact_name',['Phase 5 production QA','Phase 5 UI QA','Phase 5 pair QA']);
      assert.equal(testRows.error,null); assert(testRows.data.length>0);
      for (const row of testRows.data) {
        const audit=await client.from('audit_logs').select('id').eq('entity_type','booking').eq('entity_id',row.id).eq('action','pending');
        assert.equal(audit.error,null); assert.equal(audit.data.length,1,'Exactly one creation audit per test booking');
      }
      pass('Admin JWT verifies exactly one creation audit per scoped Phase 5 test booking');
    }
  } else {
  assert.equal((await request('/api/bookings', payload, false)).status, 401);
  assert.equal((await request('/api/bookings', payload, true, 'https://attacker.invalid')).status, 403);
  assert.equal((await request('/api/bookings', { ...payload, role: 'admin' })).status, 400);
  pass('Guest denied / cross-origin denied / injected role denied');
  const created = await request('/api/bookings', payload);
  assert([200, 201].includes(created.status), `Creation HTTP ${created.status}`);
  const booking = (await created.json()).booking;
  assert.equal(booking.status, 'pending'); assert(booking.expiresAt || booking.expires_at);
  assert(!JSON.stringify(booking).includes('contact_phone'));
  assert(created.headers.get('cache-control').includes('no-store'));
  pass('Next HTTP → Customer JWT → transactional RPC → pending booking');
  const retries = await Promise.all([request('/api/bookings', payload), request('/api/bookings', payload)]);
  for (const retry of retries) { assert([200, 201].includes(retry.status)); assert.equal((await retry.json()).booking.id, booking.id); }
  pass('concurrent identical retries return the same booking');
  assert.equal((await request('/api/bookings', { ...payload, notes: 'Different payload' })).status, 409);
  assert.equal((await request('/api/bookings', { ...payload, idempotencyKey: randomUUID() })).status, 409);
  pass('idempotency mismatch / occupied table conflict');
  const remaining = await request(query, undefined, false);
  assert(!(await remaining.json()).tables.some(table => table.table_id === payload.tableId));
  pass('pending table excluded from subsequent Guest lookup');
  const invalid = await request('/api/availability?' + new URLSearchParams({ startsAt: `${day}T20:00:00+07:00`, guests: '2' }), undefined, false);
  assert.equal(invalid.status, 422);
  pass('business hours include duration and buffer');
  const own = await client.from('bookings').select('id,customer_id,created_by,status').eq('id', booking.id).single();
  assert.equal(own.error, null); assert.equal(own.data.customer_id, identity.user.id); assert.equal(own.data.created_by, identity.user.id);
  const history = await client.from('booking_history').select('id').eq('booking_id', booking.id);
  assert.equal(history.error, null); assert(history.data.length > 0);
  pass('real JWT own-booking RLS / ownership / transaction history');
  console.log('COMPLETE: single-Customer checks PASS; separate-Customer race/isolation uses test-booking-pair.mjs; run Staff/Admin modes separately. One pending test booking retained; no reset/delete.');
  }
} catch (error) {
  console.error(`FAIL ${error instanceof assert.AssertionError ? error.message : 'transport or configuration error (details suppressed)'}`);
  process.exitCode = 1;
} finally {
  password = '';
  if (cookies) { try { await request('/auth/session', { action: 'logout' }); } catch { /* Tokens are discarded regardless. */ } }
  cookies = '';
}
