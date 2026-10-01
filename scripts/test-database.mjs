import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

// This harness intentionally accepts only an empty loopback test database.
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error('NOT RUN: set TEST_DATABASE_URL to an empty local PostgreSQL database named mocvi_test_* (see docs/database.md).');
  process.exit(2);
}
const parsed = new URL(url);
assert(['postgres:', 'postgresql:'].includes(parsed.protocol), 'Use a PostgreSQL URL');
assert.equal(parsed.search, '', 'Connection URL overrides are not allowed in the local test harness');
assert(['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname), 'Only loopback test databases are allowed');
assert(/^\/mocvi_test_[a-z0-9_]+$/.test(parsed.pathname), 'Use a dedicated mocvi_test_* database');
const clients = [];
async function connect() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  clients.push(client);
  await client.query("set statement_timeout = '15s'");
  return client;
}
const admin = await connect();
let passed = 0;
async function check(name, fn) {
  await fn();
  console.log(`PASS ${name}`);
  passed++;
}
async function actor(client, id, fn, role = 'authenticated') {
  await client.query('begin');
  try {
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [id ?? '']);
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}
// Hold the shared lock until both independent sessions demonstrably wait for it.
async function compete(left, right, first, second) {
  const pids = await Promise.all([left, right].map(async c =>
    (await c.query('select pg_backend_pid() pid')).rows[0].pid));
  await admin.query('begin');
  await admin.query('select pg_advisory_xact_lock(60260930, 1)');
  const results = Promise.allSettled([first(), second()]);
  try {
    const deadline = Date.now() + 5000;
    for (;;) {
      // Reset statistics snapshot because this polling runs in one transaction.
      await admin.query('select pg_stat_clear_snapshot()');
      const waiting = (await admin.query(
        "select count(*)::int n from pg_stat_activity where pid=any($1::int[]) and wait_event='advisory'", [pids])).rows[0].n;
      if (waiting === 2) break;
      assert(Date.now() < deadline, 'Both requests must be in flight and waiting on the database lock');
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    await admin.query('commit');
    return await results;
  } catch (error) {
    await admin.query('rollback');
    await results;
    throw error;
  }
}
const A = randomUUID(), B = randomUUID(), C = randomUUID(), S = randomUUID(), D = randomUUID();
let tables, start;
function args(table = 0, time = start, count = 2, key = randomUUID()) {
  return [key, tables[table].id, time, count, 'Demo guest', 'TEST-PHONE'];
}
function book(client, values) {
  return client.query('select * from public.create_booking($1,$2,$3,$4,$5,$6)', values);
}
try {
  assert.equal((await admin.query("select to_regnamespace('auth')::text as auth, to_regclass('public.bookings')::text as bookings")).rows[0].auth, null,
    'Use an empty plain PostgreSQL test database; never run the fixture on Supabase');
  assert.equal((await admin.query("select count(*)::int as n from information_schema.tables where table_schema='public'")).rows[0].n, 0);
  // Minimal Supabase Auth contract fixture, not an authentication implementation.
  await admin.query(`
    do $$ begin
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
    end $$;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  assert.equal((await admin.query("select count(*)::int n from pg_roles where rolname in ('anon','authenticated') and (rolsuper or rolbypassrls)")).rows[0].n,0,
    'Fixture roles must not bypass RLS');
  const migration = await readFile(new URL('../supabase/migrations/202609300001_foundation.sql', import.meta.url), 'utf8');
  await check('migration on clean PostgreSQL', () => admin.query(migration));
  const seed = await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
  await admin.query(seed);
  await admin.query(seed);
  await check('seed twice preserves 3 floors / 22 tables / 30 items and canonical capacities', async () => {
    for (const [table, expected] of [['areas',3],['tables',22],['menu_categories',6],['menu_items',30]]) {
      assert.equal((await admin.query(`select count(*)::int n from public.${table}`)).rows[0].n, expected);
    }
    const floors = (await admin.query(`select a.code, count(t.id)::int tables,
      sum(t.capacity)::int seats from public.areas a join public.tables t on t.area_id=a.id
      group by a.code order by a.code`)).rows;
    assert.deepEqual(floors, [
      {code:'floor-1',tables:8,seats:32},
      {code:'floor-2',tables:8,seats:34},
      {code:'floor-3',tables:6,seats:26},
    ]);
  });
  for (const id of [A,B,C,S,D]) await admin.query('insert into auth.users(id) values($1)', [id]);
  await admin.query("update public.profiles set role='staff' where id=$1", [S]);
  await admin.query("update public.profiles set role='admin' where id=$1", [D]);
  // Explicit stable codes keep capacity and area tests independent of catalogue order.
  const fixtureCodes = ['T1-B01','T1-B02','T1-B03','T1-B04'];
  tables = (await admin.query(`select id, code, area_id, capacity from public.tables
    where code=any($1::text[]) order by array_position($1::text[],code)`, [fixtureCodes])).rows;
  assert.deepEqual(tables.map(t=>t.code),fixtureCodes);
  assert.deepEqual(tables.map(t=>t.capacity),[2,2,4,4]);
  start = (await admin.query("select ((current_date + 2) + time '12:00') at time zone 'Asia/Ho_Chi_Minh' as t")).rows[0].t;
  const left = await connect(), right = await connect();
  const original = args();
  const created = (await actor(left,A,c => book(c,original))).rows[0];
  await check('retry returns original; changed payload fails', async () => {
    assert.equal((await actor(left,A,c => book(c,original))).rows[0].id, created.id);
    const changed = [...original]; changed[3] = 1;
    await assert.rejects(actor(left,A,c => book(c,changed)), /IDEMPOTENCY_PAYLOAD_MISMATCH/);
  });
  await check('overlap blocked; exact buffer endpoint accepted', async () => {
    await assert.rejects(actor(right,B,c => book(c,args())), e => e.code === '23P01');
    await actor(right,B,c => book(c,args(0,new Date(start.getTime()+135*60000))));
  });
  await check('RLS ownership, guest privacy, role escalation, direct writes', async () => {
    assert.equal((await actor(right,B,c => c.query('select id from public.bookings where id=$1',[created.id]))).rowCount,0);
    await assert.rejects(actor(right,null,c => c.query('select * from public.bookings'),'anon'), e => e.code==='42501');
    await assert.rejects(actor(left,A,c => c.query("update public.profiles set role='admin' where id=$1",[A])),e => e.code==='42501');
    await assert.rejects(actor(left,A,c => c.query("update public.bookings set status='cancelled' where id=$1",[created.id])),e => e.code==='42501');
    await assert.rejects(actor(left,A,c => c.query("insert into public.audit_logs(entity_id,entity_type,action,details) values($1,'booking','fake','{}')",[created.id])),e => e.code==='42501');
    await assert.rejects(actor(left,A,c => c.query('select public.confirm_booking($1)',[created.id])),e => e.code==='42501');
    await assert.rejects(actor(left,A,c => c.query('select private.expire_pending()')),e => e.code==='42501');
    await assert.rejects(actor(right,null,c => book(c,args(1)),'anon'),e => e.code==='42501');
    assert.equal((await actor(right,null,c=>c.query('select id from public.menu_items'),'anon')).rowCount,30);
    assert.equal((await actor(right,B,c=>c.query('select id from public.booking_history where booking_id=$1',[created.id]))).rowCount,0);
    assert.equal((await actor(right,B,c=>c.query('select id from public.notifications where recipient_id=$1',[A]))).rowCount,0);
    assert.equal((await actor(left,A,c=>c.query('select * from public.audit_logs'))).rowCount,0);
    assert((await actor(left,D,c=>c.query('select * from public.audit_logs'))).rowCount>0);
    assert.equal((await actor(left,A,c=>c.query("update public.profiles set full_name='Test profile' where id=$1",[A]))).rowCount,1);
    assert.equal((await actor(right,B,c=>c.query("update public.profiles set full_name='Intruder' where id=$1",[A]))).rowCount,0);
  });
  await check('capacity / minimum notice / maximum advance / hours', async () => {
    await assert.rejects(actor(left,C,c => book(c,args(1,start,3))), /INVALID_CAPACITY/);
    await assert.rejects(actor(left,C,c => book(c,args(1,new Date()))), /MIN_NOTICE/);
    await assert.rejects(actor(left,C,c => book(c,args(1,new Date(Date.now()+31*86400000)))), /MAX_ADVANCE/);
    await assert.rejects(actor(left,C,c => book(c,args(1,new Date(start.getTime()+9*3600000)))), /OUTSIDE_BUSINESS_HOURS/);
    await admin.query("insert into public.closure_dates values(($1::timestamptz at time zone 'Asia/Ho_Chi_Minh')::date,'test')",[start]);
    await assert.rejects(actor(left,C,c => book(c,args(1))), /OUTSIDE_BUSINESS_HOURS/);
    await admin.query('delete from public.closure_dates');
  });
  await check('expired pending cancels atomically and cannot confirm', async () => {
    await admin.query("update public.bookings set expires_at=clock_timestamp()-interval '1 second' where id=$1",[created.id]);
    const expired = (await actor(left,S,c => c.query('select * from public.confirm_booking($1)',[created.id]))).rows[0];
    assert.equal(expired.status,'cancelled'); assert.equal(expired.reason,'pending_expired');
    await actor(left,A,c => book(c,args()));
    assert.equal((await admin.query("select count(*)::int n from public.booking_history where booking_id=$1 and to_status='cancelled'",[created.id])).rows[0].n,1);
  });
  // Reset only test bookings using an isolated fixture (no production reset helper).
  async function clearBookings() {
    await admin.query('truncate public.notifications,public.booking_history,public.audit_logs,public.bookings');
  }
  await clearBookings();
  await check('opening / closing boundaries and customer service endpoint', async () => {
    const opening = new Date(start.getTime()-2*3600000);
    await actor(left,A,c=>book(c,args(0,opening)));
    // A customer can leave one table when service ends, while its cleaning continues.
    await actor(left,A,c=>book(c,args(1,start)));
    await assert.rejects(actor(right,B,c=>book(c,args(2,new Date(opening.getTime()-1)))),/OUTSIDE_BUSINESS_HOURS/);
    const latest = new Date(start.getTime()+(7*60+45)*60000);
    await actor(right,B,c=>book(c,args(2,latest)));
    await assert.rejects(actor(right,C,c=>book(c,args(3,new Date(latest.getTime()+1)))),/OUTSIDE_BUSINESS_HOURS/);
  });
  await clearBookings();
  await check('staff phone booking without account; caller cannot spoof a customer', async () => {
    const request=[...args(),null,'','phone',null];
    const b=(await actor(left,S,c=>c.query('select * from public.create_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',request))).rows[0];
    assert.equal(b.status,'confirmed'); assert.equal(b.customer_id,null); assert.equal(b.created_by,S);
    await assert.rejects(actor(right,A,c=>c.query('select * from public.create_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',request)),/SOURCE_NOT_ALLOWED/);
    await assert.rejects(actor(right,A,c=>c.query('select * from public.create_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[...args(1),null,'','website',B])),/OWNER_MISMATCH/);
    assert.equal((await admin.query('select count(*)::int n from public.notifications')).rows[0].n,0);
  });
  await clearBookings();
  await check('confirmation before expiry is idempotent with exactly one transition', async () => {
    const b=(await actor(left,A,c=>book(c,args()))).rows[0];
    for (let i=0;i<2;i++) {
      assert.equal((await actor(right,S,c=>c.query('select * from public.confirm_booking($1)',[b.id]))).rows[0].status,'confirmed');
    }
    assert.equal((await admin.query('select count(*)::int n from public.booking_history')).rows[0].n,2);
    assert.equal((await admin.query('select count(*)::int n from public.notifications')).rows[0].n,2);
  });
  await clearBookings();
  await check('expiration is repeatable, releases exclusion, and preserves physical table state', async () => {
    const b=(await actor(left,A,c=>book(c,args()))).rows[0];
    await admin.query("update public.bookings set expires_at=clock_timestamp()-interval '1 second' where id=$1",[b.id]);
    await admin.query("update public.tables set status='occupied' where id=$1",[tables[0].id]);
    assert.equal((await admin.query('select private.expire_pending() n')).rows[0].n,1);
    assert.equal((await admin.query('select private.expire_pending() n')).rows[0].n,0);
    assert.equal((await admin.query('select status from public.tables where id=$1',[tables[0].id])).rows[0].status,'occupied');
    await actor(right,B,c=>book(c,args()));
    await admin.query("update public.tables set status='available' where id=$1",[tables[0].id]);
  });
  await clearBookings();
  await check('unavailable table and inactive area deny new bookings', async () => {
    await admin.query("update public.tables set status='out_of_service' where id=$1",[tables[0].id]);
    await assert.rejects(actor(left,A,c=>book(c,args())),/TABLE_UNAVAILABLE/);
    await admin.query("update public.tables set status='available' where id=$1",[tables[0].id]);
    assert.equal((await admin.query('update public.areas set is_active=false where id=$1',[tables[0].area_id])).rowCount,1);
    await assert.rejects(actor(left,A,c=>book(c,args())),/TABLE_UNAVAILABLE/);
    assert.equal((await admin.query('update public.areas set is_active=true where id=$1',[tables[0].area_id])).rowCount,1);
  });
  await clearBookings();
  await check('two independent connections: same table has exactly one winner', async () => {
    const results=await compete(left,right,()=>actor(left,A,c=>book(c,args())),()=>actor(right,B,c=>book(c,args())));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.find(r=>r.status==='rejected').reason.code,'23P01');
    assert.equal((await admin.query('select count(*)::int n from public.booking_history')).rows[0].n,1);
  });
  await clearBookings();
  await check('same customer overlapping different tables rejected', async () => {
    const results=await compete(left,right,()=>actor(left,A,c=>book(c,args(0))),()=>actor(right,A,c=>book(c,args(1))));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.find(r=>r.status==='rejected').reason.code,'23P01');
  });
  await clearBookings();
  await check('customer limit survives concurrent requests', async () => {
    await actor(left,A,c=>book(c,args(0)));
    await actor(left,A,c=>book(c,args(0,new Date(start.getTime()+86400000))));
    const results=await compete(left,right,
      ()=>actor(left,A,c=>book(c,args(0,new Date(start.getTime()+2*86400000)))),
      ()=>actor(right,A,c=>book(c,args(1,new Date(start.getTime()+3*86400000)))));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.match(results.find(r=>r.status==='rejected').reason.message,/CUSTOMER_BOOKING_LIMIT/);
  });
  await clearBookings();
  await check('concurrent idempotent retry produces one booking and event', async () => {
    const request=args();
    const results=await compete(left,right,()=>actor(left,A,c=>book(c,request)),()=>actor(right,A,c=>book(c,request)));
    assert(results.every(r=>r.status==='fulfilled'));
    assert.equal(results[0].value.rows[0].id,results[1].value.rows[0].id);
    assert.equal((await admin.query('select count(*)::int n from public.booking_history')).rows[0].n,1);
  });
  await clearBookings();
  await check('event insertion failure rolls back booking', async () => {
    await admin.query("create function private.test_fail() returns trigger language plpgsql as $$ begin raise exception 'TEST_EVENT_FAILURE'; end $$; create trigger test_event_failure before insert on public.booking_history for each row execute function private.test_fail()");
    await assert.rejects(actor(left,A,c=>book(c,args())), /TEST_EVENT_FAILURE/);
    assert.equal((await admin.query('select count(*)::int n from public.bookings')).rows[0].n,0);
    for (const table of ['booking_history','notifications','audit_logs']) {
      assert.equal((await admin.query(`select count(*)::int n from public.${table}`)).rows[0].n,0);
    }
    await admin.query('drop trigger test_event_failure on public.booking_history; drop function private.test_fail()');
  });
  await check('locked customer denied; existing booking preserved', async () => {
    const b=(await actor(left,A,c=>book(c,args()))).rows[0];
    await admin.query('update public.profiles set is_active=false where id=$1',[A]);
    await assert.rejects(actor(left,A,c=>book(c,args(1))),/AUTH_REQUIRED/);
    assert.equal((await admin.query('select status from public.bookings where id=$1',[b.id])).rows[0].status,'pending');
  });
  console.log(`${passed} database checks passed. Supabase Auth/JWT integration requires separate validation.`);
} finally {
  await Promise.allSettled(clients.map(c=>c.end()));
}
