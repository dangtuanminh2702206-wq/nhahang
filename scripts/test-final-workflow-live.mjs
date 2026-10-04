import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { parseCookieHeader } from '@supabase/ssr';
import pg from 'pg';
import { connection } from './database-backup.mjs';

// Operator-approved, bounded production QA. No credential/token persistence.
process.loadEnvFile('.env.local');
const site = 'https://moc-vi-restaurant.vercel.app';
assert.equal(process.env.DATABASE_BACKUP_PROJECT_REF, 'unhybmmbgumyhzaftlli', 'Approved read-back project required');
const databaseConfig = connection(process.env.DATABASE_BACKUP_URL);
assert(databaseConfig.ssl, 'Verified cloud TLS required');
const pool = new pg.Pool({ ...databaseConfig, max: 2 });
try { await pool.query('select current_database()'); }
catch { await pool.end(); throw new Error('Production read-back connection/TLS unavailable; no login or mutation performed'); }
// Mutations use real website sessions only. SQL read-back is READ ONLY with
// authenticated RLS subject, not a claim of independent PostgREST/JWT testing.
const allowedTables = new Set(['profiles','menu_items','menu_combos','bookings','booking_history','orders','order_items','order_history','order_notifications']);
function databaseReader(id) {
  return { from(table) {
    assert(allowedTables.has(table)); const values = []; const clauses = []; let fields = '*'; let order = ''; let limit = ''; let single = false;
    const identifier = value => { assert(/^[a-z_]+$/.test(value)); return `"${value}"`; };
    const query = {
      select(value) { fields = value === '*' ? '*' : value.split(',').map(identifier).join(','); return query; },
      eq(field, value) { values.push(value); clauses.push(`${identifier(field)}=$${values.length}`); return query; },
      in(field, value) { values.push(value); clauses.push(`${identifier(field)}=any($${values.length})`); return query; },
      order(field) { order = ` order by ${identifier(field)}`; return query; },
      limit(value) { assert(Number.isSafeInteger(value) && value > 0 && value <= 100); limit = ` limit ${value}`; return query; },
      single() { single = true; return query; },
      async then(resolve, reject) {
        let client;
        try {
          client = await pool.connect(); await client.query('begin read only'); await client.query('set local role authenticated');
          await client.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
          const result = await client.query(`select ${fields} from public.${table}${clauses.length ? ' where '+clauses.join(' and ') : ''}${order}${limit}`, values);
          await client.query('commit'); return resolve({ data: single ? result.rows[0] : result.rows, error: null });
        } catch { if (client) await client.query('rollback').catch(() => {}); return reject(new Error('Read-back failed; sensitive details suppressed')); }
        finally { client?.release(); }
      },
    }; return query;
  } };
}
const origin = 'http://127.0.0.1:3014';
const csrf = randomBytes(32).toString('hex');
let busy = false; let executed = false; let results = []; let stage = 'READY';
let outcome = 'NOT RUN'; let cleanup = 'NOT NEEDED';
const pass = label => results.push(`PASS: ${label}`);
async function call(path, payload, session) {
  return fetch(site + path, { method: payload === undefined ? 'GET' : 'POST',
    headers: { origin: site, ...(session ? { cookie: session.cookie } : {}),
      ...(payload === undefined ? {} : { 'content-type': 'application/json' }) },
    body: payload === undefined ? undefined : JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
}
async function rows(session, table, field, id) {
  const result = await session.db.from(table).select('*').eq(field, id);
  assert.equal(result.error, null, 'Authorized read-back required'); return result.data;
}
async function run(logins) {
  const sessions = []; let bookingKey; let bookingId; let customerId; let complete = false;
  try {
    stage = 'login and trusted roles';
    for (const [index, login] of logins.entries()) {
      const response = await call('/auth/session', { action: 'login', ...login });
      login.password = ''; assert.equal(response.status, 200, 'New QA credential login required');
      const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
      assert(cookie, 'Session cookie required');
      const cookieParts = parseCookieHeader(cookie).filter(item => item.name.startsWith('sb-unhybmmbgumyhzaftlli-auth-token')).sort((left,right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
      const encoded = cookieParts.map(item => item.value).join(''); assert(encoded.startsWith('base64-'), 'Production session required');
      const sessionValue = JSON.parse(Buffer.from(encoded.slice(7), 'base64url').toString());
      const session = { cookie, id: sessionValue.user.id }; session.db = databaseReader(session.id); sessions.push(session);
      const verified = await call('/auth/session', undefined, session); assert.equal(verified.status, 200);
      const trusted = await verified.json(); assert.equal(trusted.authenticated, true); assert.equal(trusted.active, true);
      assert.equal(trusted.role, index === 2 ? 'staff' : 'customer');
      const db = session.db;
      const profile = await db.from('profiles').select('role,is_active').eq('id', session.id).single();
      assert.equal(profile.error, null); assert.equal(profile.data.is_active, true);
      assert.equal(profile.data.role, index === 2 ? 'staff' : 'customer', 'Dedicated QA role required');
    }
    assert.notEqual(sessions[0].id, sessions[1].id, 'Distinct Customers A/B required');
    const [a, b, staff] = sessions; customerId = a.id;
    pass('fresh Customer A/B and Staff login with trusted active roles');
    stage = 'catalogue and availability';
    const catalogue = [];
    for (const [table, kind] of [['menu_items', 'dish'], ['menu_combos', 'combo']]) {
      const value = await a.db.from(table).select('code,name,price').eq('is_active', true).eq('is_available', true).order('code').limit(1);
      assert.equal(value.error, null); assert.equal(value.data.length, 1);
      catalogue.push({ ...value.data[0], kind });
    }
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 4 * 86400000));
    const startsAt = `${date}T18:00:00+07:00`;
    const availability = await call('/api/availability?' + new URLSearchParams({ startsAt, guests: '2' }));
    assert.equal(availability.status, 200); const tables = (await availability.json()).tables;
    assert(tables.length, 'One policy-compliant available table required');
    bookingKey = randomUUID();
    const payload = { startsAt, guests: 2, tableId: tables[0].table_id, idempotencyKey: bookingKey,
      name: 'FINAL QA', phone: '0900000000', notes: 'FINAL QA — operator-approved workflow; not a real visit.' };
    stage = 'booking create and retry'; cleanup = 'PENDING';
    const created = await call('/api/bookings', payload, a); assert.equal(created.status, 200);
    const booking = (await created.json()).booking; bookingId = booking.id; assert.equal(booking.status, 'pending');
    const historyBefore = await rows(a, 'booking_history', 'booking_id', bookingId);
    const retry = await call('/api/bookings', payload, a); assert.equal(retry.status, 200);
    assert.equal((await retry.json()).booking.id, bookingId);
    assert.equal((await rows(a, 'booking_history', 'booking_id', bookingId)).length, historyBefore.length);
    assert.equal((await rows(b, 'bookings', 'id', bookingId)).length, 0);
    assert.equal((await rows(b, 'booking_history', 'booking_id', bookingId)).length, 0);
    pass('one pending booking, idempotent HTTP retry, B cannot read A booking/history');
    const items = catalogue.map(item => ({ kind: item.kind, code: item.code, quantity: 1 }));
    const orderPayload = { action: 'create', bookingId, requestId: randomUUID(), items };
    stage = 'unconfirmed booking rejects order';
    assert.equal((await call('/api/orders', orderPayload, a)).status, 422);
    stage = 'Staff confirms booking';
    assert.equal((await call('/api/staff/bookings/action', { id: bookingId, action: 'confirm', requestId: randomUUID() }, staff)).status, 200);
    assert.equal((await rows(a, 'bookings', 'id', bookingId))[0].status, 'confirmed');
    stage = 'Customer sends dish and combo';
    const submitted = await call('/api/orders', orderPayload, a); assert.equal(submitted.status, 200);
    let order = (await submitted.json()).order;
    assert.equal(order.status, 'pending'); assert.equal(Number(order.totalAmount), catalogue.reduce((sum, item) => sum + Number(item.price), 0));
    const lines = await rows(a, 'order_items', 'order_id', order.id); assert.equal(lines.length, 2);
    for (const item of catalogue) {
      const line = lines.find(row => row.item_code === item.code && row.item_type === item.kind);
      assert(line); assert.equal(line.item_name, item.name); assert.equal(Number(line.unit_price), Number(item.price));
    }
    const events = await rows(a, 'order_history', 'order_id', order.id);
    const retried = await call('/api/orders', orderPayload, a); assert.equal(retried.status, 200);
    assert.equal((await retried.json()).order.id, order.id);
    assert.equal((await rows(a, 'order_history', 'order_id', order.id)).length, events.length);
    pass('confirmed booking order: server price/name snapshots, dish+combo, retry without extra history');
    stage = 'A/B ownership and role denials';
    for (const [table, field, id] of [['orders', 'id', order.id], ['order_items', 'order_id', order.id], ['order_history', 'order_id', order.id]]) {
      assert.equal((await rows(b, table, field, id)).length, 0);
    }
    assert.equal((await call('/api/orders', { ...orderPayload, requestId: randomUUID() }, b)).status, 404);
    assert.equal((await call('/api/staff/orders/action', { orderId: order.id, action: 'confirm', requestId: randomUUID() }, a)).status, 403);
    assert.equal((await call('/api/orders', { ...orderPayload, requestId: randomUUID() })).status, 401);
    assert.equal((await call('/api/orders', { ...orderPayload, requestId: randomUUID(), items: [{ ...items[0], quantity: 0 }] }, a)).status, 400);
    pass('B order/line/history isolation; foreign owner, Customer Staff action, Guest and quantity zero denied');
    stage = 'pending edit and stale version';
    const updatedItems = items.map((item, index) => ({ ...item, quantity: index === 0 ? 2 : 1 }));
    const update = { action: 'update', bookingId, orderId: order.id, requestId: randomUUID(), expectedVersion: order.version, items: updatedItems };
    const edited = await call('/api/orders', update, a); assert.equal(edited.status, 200);
    order = (await edited.json()).order;
    assert.equal((await call('/api/orders', { ...update, requestId: randomUUID() }, a)).status, 409);
    pass('pending edit succeeds; stale version cannot overwrite');
    stage = 'Staff processes order';
    for (const [action, expected] of [['confirm', 'confirmed'], ['preparing', 'preparing'], ['served', 'served']]) {
      const changed = await call('/api/staff/orders/action', { orderId: order.id, action, expectedVersion: order.version, requestId: randomUUID() }, staff);
      assert.equal(changed.status, 200); order = (await changed.json()).order; assert.equal(order.status, expected);
      assert.equal((await rows(a, 'orders', 'id', order.id))[0].status, expected);
      if (action === 'confirm') assert.equal((await call('/api/orders', { ...update, requestId: randomUUID(), expectedVersion: order.version }, a)).status, 409);
    }
    const finalHistory = await rows(a, 'order_history', 'order_id', order.id); assert.equal(finalHistory.length, 5);
    const notifications = await a.db.from('order_notifications').select('id').in('history_id', finalHistory.map(row => row.id));
    assert.equal(notifications.error, null); assert.equal(notifications.data.length, 5);
    const foreignNotifications = await b.db.from('order_notifications').select('id').in('history_id', finalHistory.map(row => row.id));
    assert.equal(foreignNotifications.error, null); assert.equal(foreignNotifications.data.length, 0);
    pass('Staff confirmed → preparing → served persisted; Customer edit after confirmation denied; internal notifications owner-only');
    complete = true;
  } catch { results.push(`FAIL: ${stage}; sensitive provider details suppressed`); }
  finally {
    if (bookingKey && sessions[2]) {
      try {
        const found = await sessions[2].db.from('bookings').select('id,status,contact_name').eq('created_by', customerId).eq('idempotency_key', bookingKey);
        assert.equal(found.error, null); assert(found.data.length <= 1);
        for (const row of found.data) {
          assert.equal(row.contact_name, 'FINAL QA', 'Only owned QA fixture can be cleaned');
          if (!['cancelled', 'completed', 'rejected', 'no_show'].includes(row.status)) {
            assert.equal((await call('/api/staff/bookings/action', { id: row.id, action: 'cancel', reason: 'FINAL QA cleanup; retain history/audit', requestId: randomUUID() }, sessions[2])).status, 200);
          }
          assert.equal((await rows(sessions[2], 'bookings', 'id', row.id))[0].status, 'cancelled');
        }
        cleanup = 'PASS'; pass('QA booking cancelled; schedule released; history/audit retained');
      } catch { cleanup = 'BLOCKED'; results.push('ACTION REQUIRED: QA cleanup not verified; do not rerun automatically'); }
    }
    for (const login of logins) login.password = '';
    for (const session of sessions) {
      try { assert.equal((await call('/auth/session', { action: 'logout' }, session)).status, 200); }
      catch { results.push('WARNING: logout not verified; session discarded'); complete = false; }
      session.cookie = ''; session.db = null;
    }
    outcome = complete && cleanup === 'PASS' ? 'PASS' : 'PARTIAL'; stage = 'COMPLETE';
  }
}
const server = createServer(async (request, response) => {
  const reply = (status, type, value) => { response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store',
    'referrer-policy': 'no-referrer', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'" }); response.end(value); };
  if (request.headers.host !== '127.0.0.1:3014') return reply(403, 'text/plain', 'Loopback Host required');
  if (request.method === 'GET' && request.url === '/status') return reply(200, 'application/json', JSON.stringify({ stage, busy, outcome, cleanup, results }));
  if (request.method === 'GET' && request.url === '/') return reply(200, 'text/html; charset=utf-8', `<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>Final workflow QA</title><style>body{font:16px system-ui;max-width:46rem;margin:2rem auto;padding:1rem}fieldset{margin:1rem 0}label{display:block;margin:.75rem 0}input{display:block;max-width:100%;box-sizing:border-box;padding:.5rem}button{padding:.75rem}</style><h1>Hồi quy bản chính — FINAL QA</h1><p>Nhập hai Customer khác nhau và một Staff test sau khi đổi mật khẩu. Chỉ tạo một booking QA, xử lý đơn món, cuối lượt hủy booking. Không lưu mật khẩu/JWT vào file/log. Không thử lại tự động khi lỗi.</p><form method="post" action="/run" autocomplete="off"><input type="hidden" name="csrf" value="${csrf}">${['Customer A','Customer B','Staff'].map((label, index) => `<fieldset><legend>${label}</legend><label>Email<input type="email" name="email${index}" required></label><label>Mật khẩu<input type="password" name="password${index}" required autocomplete="off"></label></fieldset>`).join('')}<button ${executed ? 'disabled' : ''}>Chạy hồi quy</button></form><p><a href="/status">Xem kết quả đã khử thông tin nhạy cảm</a></p></html>`);
  if (request.method !== 'POST' || request.url !== '/run') return reply(405, 'text/plain', 'Method denied');
  if (request.headers.origin && ![origin, 'null'].includes(request.headers.origin)) return reply(403, 'text/plain', 'Origin denied');
  if (!request.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) return reply(415, 'text/plain', 'Form required');
  if (busy || executed) return reply(409, 'text/plain', 'One run only; inspect results before another test');
  let raw = ''; for await (const chunk of request) { raw += chunk; if (raw.length > 8192) return reply(413, 'text/plain', 'Too large'); }
  const fields = new URLSearchParams(raw); raw = '';
  if (fields.get('csrf') !== csrf) return reply(403, 'text/plain', 'Stale form; reopen /');
  const logins = [0,1,2].map(index => ({ email: fields.get(`email${index}`)?.trim(), password: fields.get(`password${index}`) }));
  fields.forEach((value, name) => { if (name.startsWith('password')) fields.set(name, ''); });
  if (logins.some(item => !item.email || !item.password || item.password.length < 8)) return reply(400, 'text/plain', 'Three QA logins required');
  busy = true; executed = true;
  try { await run(logins); return reply(200, 'application/json', JSON.stringify({ outcome, cleanup, results })); }
  finally { busy = false; for (const item of logins) item.password = ''; }
});
server.listen(3014, '127.0.0.1', () => console.log(`Final workflow QA ready: ${origin}; no credentials in output.`));
const shutdown = () => { if (busy) return; server.close(async () => { await pool.end(); process.exit(0); }); };
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
