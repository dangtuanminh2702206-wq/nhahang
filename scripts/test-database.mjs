import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
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
  for (const file of (await readdir(new URL('../supabase/migrations/', import.meta.url))).filter(f=>f.endsWith('.sql')).sort()) {
    await check(`migration ${file} on clean PostgreSQL`, async () => admin.query(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8')));
  }
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
  await clearBookings();
  function availability(time = start, count = 2) {
    return actor(right,null,c=>c.query('select * from public.find_available_tables($1,$2)',[time,count]),'anon');
  }
  await check('Guest availability is minimal; capacity and inactive catalogue filtered', async () => {
    const all = await availability();
    assert.equal(all.rowCount,22);
    assert.deepEqual(Object.keys(all.rows[0]).sort(),['area_code','capacity','table_code','table_id']);
    assert((await availability(start,8)).rows.every(t=>t.capacity>=8));
    await admin.query("update public.tables set is_active=false where id=$1",[tables[0].id]);
    assert(!(await availability()).rows.some(t=>t.table_id===tables[0].id));
    await admin.query("update public.tables set is_active=true,status='out_of_service' where id=$1",[tables[0].id]);
    assert(!(await availability()).rows.some(t=>t.table_id===tables[0].id));
    await admin.query("update public.tables set status='occupied' where id=$1",[tables[0].id]);
    assert((await availability()).rows.some(t=>t.table_id===tables[0].id),'Physical occupied does not block future website schedule');
    await admin.query("update public.tables set status='available' where id=$1",[tables[0].id]);
    await admin.query('update public.areas set is_active=false where id=$1',[tables[0].area_id]);
    assert.equal((await availability()).rowCount,14);
    await admin.query('update public.areas set is_active=true where id=$1',[tables[0].area_id]);
    assert.equal((await admin.query("select has_function_privilege('public','public.find_available_tables(timestamptz,integer)','EXECUTE') allowed")).rows[0].allowed,false);
  });
  await check('availability opening / closing / notice / advance / closures', async () => {
    assert.equal((await availability(new Date(start.getTime()-2*3600000))).rowCount,22);
    assert.equal((await availability(new Date(start.getTime()+465*60000))).rowCount,22);
    await assert.rejects(availability(new Date(start.getTime()+466*60000)),/OUTSIDE_BUSINESS_HOURS/);
    await assert.rejects(availability(new Date()),/MIN_NOTICE/);
    await assert.rejects(availability(new Date(Date.now()+31*86400000)),/MAX_ADVANCE/);
    await assert.rejects(availability(start,0),/INVALID_CAPACITY/);
    await assert.rejects(availability(start,9),/INVALID_CAPACITY/);
    await admin.query("insert into public.closure_dates values(($1::timestamptz at time zone 'Asia/Ho_Chi_Minh')::date,'test')",[start]);
    await assert.rejects(availability(),/OUTSIDE_BUSINESS_HOURS/);
    await admin.query('delete from public.closure_dates');
  });
  await check('availability buffer boundaries and expired pending are read-only', async () => {
    const booking=(await actor(left,A,c=>book(c,args()))).rows[0];
    assert(!(await availability()).rows.some(t=>t.table_id===tables[0].id));
    assert(!(await availability(new Date(start.getTime()+134*60000))).rows.some(t=>t.table_id===tables[0].id));
    assert((await availability(new Date(start.getTime()+135*60000))).rows.some(t=>t.table_id===tables[0].id));
    await admin.query("update public.bookings set expires_at=clock_timestamp()-interval '1 second' where id=$1",[booking.id]);
    assert((await availability()).rows.some(t=>t.table_id===tables[0].id));
    assert.equal((await admin.query('select status from public.bookings where id=$1',[booking.id])).rows[0].status,'pending');
    await actor(left,B,c=>book(c,args()));
    assert.equal((await admin.query('select status from public.bookings where id=$1',[booking.id])).rows[0].status,'cancelled');
  });
  await clearBookings();
  await check('stale availability cannot bypass transactional overlap or ownership', async () => {
    assert((await availability()).rows.some(t=>t.table_id===tables[0].id));
    const key=randomUUID();
    await actor(left,A,c=>book(c,args(0,start,2,key)));
    await assert.rejects(actor(right,B,c=>book(c,args(0,start,2,key))),e=>e.code==='23P01');
    const other=(await actor(right,B,c=>book(c,args(1,start,2,key)))).rows[0];
    assert.equal(other.customer_id,B);
    assert.equal((await actor(right,B,c=>c.query('select id from public.bookings where customer_id=$1',[A]))).rowCount,0);
  });
  await clearBookings();
  function cancel(client, id) { return client.query('select * from public.cancel_booking($1)', [id]); }
  async function eventCounts(id) {
    return (await admin.query(`select
      (select count(*)::int from public.booking_history where booking_id=$1) history,
      (select count(*)::int from public.notifications n join public.booking_history h on h.id=n.history_id where h.booking_id=$1) notifications,
      (select count(*)::int from public.audit_logs where entity_id=$1) audit`, [id])).rows[0];
  }
  await check('customer cancellation exact SQL boundary uses the production predicate', async () => {
    const rows=(await admin.query(`select
      private.cancellation_window_open('2030-01-01 11:00Z','2030-01-01 10:00Z',60) exact,
      private.cancellation_window_open('2030-01-01 10:59:59.999999Z','2030-01-01 10:00Z',60) below,
      private.cancellation_window_open('2030-01-01 11:00:00.000001Z','2030-01-01 10:00Z',60) above`)).rows[0];
    assert.deepEqual(rows,{exact:true,below:false,above:true});
  });
  await check('pending and confirmed cancellation releases availability; retry has one event', async () => {
    for (const confirmed of [false,true]) {
      await clearBookings();
      const b=(await actor(left,A,c=>book(c,args()))).rows[0];
      if (confirmed) await actor(right,S,c=>c.query('select * from public.confirm_booking($1)',[b.id]));
      assert(!(await availability()).rows.some(t=>t.table_id===tables[0].id));
      const before=await eventCounts(b.id);
      const result=(await actor(left,A,c=>cancel(c,b.id))).rows[0];
      assert.equal(result.status,'cancelled'); assert.equal(result.cancellation_source,'customer');
      assert.equal(result.reason,'customer_cancelled');
      await actor(left,A,c=>cancel(c,b.id));
      assert.deepEqual(await eventCounts(b.id),Object.fromEntries(Object.entries(before).map(([k,v])=>[k,v+1])));
      assert((await availability()).rows.some(t=>t.table_id===tables[0].id));
    }
  });
  await clearBookings();
  await check('cancellation rejects foreign owner, Guest, Staff, Admin and inactive Customer', async () => {
    const b=(await actor(left,A,c=>book(c,args()))).rows[0];
    await assert.rejects(actor(right,B,c=>cancel(c,b.id)),/BOOKING_NOT_FOUND/);
    await assert.rejects(actor(right,B,c=>cancel(c,randomUUID())),/BOOKING_NOT_FOUND/);
    await assert.rejects(actor(right,null,c=>cancel(c,b.id),'anon'),e=>e.code==='42501');
    for (const id of [S,D]) await assert.rejects(actor(right,id,c=>cancel(c,b.id)),/CUSTOMER_REQUIRED/);
    await admin.query('update public.profiles set is_active=false where id=$1',[A]);
    await assert.rejects(actor(left,A,c=>cancel(c,b.id)),/AUTH_REQUIRED/);
    await admin.query('update public.profiles set is_active=true where id=$1',[A]);
    assert.equal((await admin.query('select status from public.bookings where id=$1',[b.id])).rows[0].status,'pending');
  });
  await clearBookings();
  await check('RPC rejects below 60 minutes and terminal states without side effects', async () => {
    const b=(await actor(left,A,c=>book(c,args()))).rows[0];
    await admin.query("update public.bookings set starts_at=clock_timestamp()+interval '59 minutes', ends_at=clock_timestamp()+interval '179 minutes', blocked_until=clock_timestamp()+interval '194 minutes' where id=$1",[b.id]);
    await assert.rejects(actor(left,A,c=>cancel(c,b.id)),/CANCELLATION_WINDOW/);
    for (const status of ['checked_in','completed','rejected','no_show']) {
      await admin.query("update public.bookings set status=$2, actual_guest_count=2, checked_in_at=clock_timestamp(), completed_at=clock_timestamp(), reason='TEST ONLY' where id=$1",[b.id,status]);
      await assert.rejects(actor(left,A,c=>cancel(c,b.id)),/INVALID_TRANSITION/);
    }
    assert.deepEqual(await eventCounts(b.id),{history:1,notifications:1,audit:1});
  });
  await clearBookings();
  await check('expired pending cancellation returns system expiration once', async () => {
    const b=(await actor(left,A,c=>book(c,args()))).rows[0];
    await admin.query("update public.bookings set expires_at=clock_timestamp()-interval '1 second' where id=$1",[b.id]);
    const result=(await actor(left,A,c=>cancel(c,b.id))).rows[0];
    assert.equal(result.reason,'pending_expired'); assert.equal(result.cancellation_source,'system');
    await actor(left,A,c=>cancel(c,b.id));
    assert.deepEqual(await eventCounts(b.id),{history:2,notifications:2,audit:2});
  });
  await clearBookings();
  await check('two real connections cancel simultaneously with exactly one transition', async () => {
    const b=(await actor(left,A,c=>book(c,args()))).rows[0];
    const results=await compete(left,right,()=>actor(left,A,c=>cancel(c,b.id)),()=>actor(right,A,c=>cancel(c,b.id)));
    assert(results.every(r=>r.status==='fulfilled' && r.value.rows[0].status==='cancelled'));
    assert.deepEqual(await eventCounts(b.id),{history:2,notifications:2,audit:2});
  });
  await clearBookings();
  await check('cancel versus confirm race preserves terminal state and event consistency', async () => {
    const b=(await actor(left,A,c=>book(c,args()))).rows[0];
    const results=await compete(left,right,()=>actor(left,A,c=>cancel(c,b.id)),()=>actor(right,S,c=>c.query('select * from public.confirm_booking($1)',[b.id])));
    assert.equal(results[0].status,'fulfilled');
    if (results[1].status==='rejected') assert.match(results[1].reason.message,/INVALID_TRANSITION/);
    assert.equal((await admin.query('select status from public.bookings where id=$1',[b.id])).rows[0].status,'cancelled');
    const count=results[1].status==='fulfilled'?3:2;
    assert.deepEqual(await eventCounts(b.id),{history:count,notifications:count,audit:count});
  });
  await clearBookings();
  await check('cancel versus system expiration race records exactly one system transition', async () => {
    const b=(await actor(left,A,c=>book(c,args()))).rows[0];
    await admin.query("update public.bookings set expires_at=clock_timestamp()-interval '1 second' where id=$1",[b.id]);
    const results=await compete(left,right,()=>actor(left,A,c=>cancel(c,b.id)),()=>right.query('select private.expire_pending()'));
    assert(results.every(r=>r.status==='fulfilled'));
    assert.equal((await admin.query('select reason from public.bookings where id=$1',[b.id])).rows[0].reason,'pending_expired');
    assert.deepEqual(await eventCounts(b.id),{history:2,notifications:2,audit:2});
  });
  await clearBookings();
  await check('cancellation event failure rolls back status and every side effect', async () => {
    const b=(await actor(left,A,c=>book(c,args()))).rows[0];
    await admin.query("create function private.test_fail() returns trigger language plpgsql as $$ begin raise exception 'TEST_CANCEL_EVENT_FAILURE'; end $$; create trigger test_event_failure before insert on public.booking_history for each row execute function private.test_fail()");
    await assert.rejects(actor(left,A,c=>cancel(c,b.id)),/TEST_CANCEL_EVENT_FAILURE/);
    assert.equal((await admin.query('select status from public.bookings where id=$1',[b.id])).rows[0].status,'pending');
    assert.deepEqual(await eventCounts(b.id),{history:1,notifications:1,audit:1});
    await admin.query('drop trigger test_event_failure on public.booking_history; drop function private.test_fail()');
  });
  await clearBookings();
  await check('notification read_at is owner-only; content and history remain protected', async () => {
    const b=(await actor(left,A,c=>book(c,args()))).rows[0];
    const n=(await admin.query('select id from public.notifications where recipient_id=$1',[A])).rows[0];
    assert.equal((await actor(right,B,c=>c.query('update public.notifications set read_at=clock_timestamp() where id=$1',[n.id]))).rowCount,0);
    assert.equal((await actor(left,A,c=>c.query('update public.notifications set read_at=clock_timestamp() where id=$1',[n.id]))).rowCount,1);
    await assert.rejects(actor(left,A,c=>c.query('update public.notifications set recipient_id=$1 where id=$2',[B,n.id])),e=>e.code==='42501');
    await assert.rejects(actor(left,A,c=>c.query("update public.booking_history set reason='fake' where booking_id=$1",[b.id])),e=>e.code==='42501');
  });
  await clearBookings();
  await check('Staff operations transition booking and physical table atomically', async () => {
    const request = [...args(2), null, '', 'phone', null];
    const created = (await actor(left, S, c => c.query('select * from public.create_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', request))).rows[0];
    await admin.query("update public.bookings set starts_at=clock_timestamp()-interval '1 minute', ends_at=clock_timestamp()+interval '119 minutes', blocked_until=clock_timestamp()+interval '134 minutes' where id=$1", [created.id]);
    const checkedIn = (await actor(right, S, c => c.query('with op as materialized (select public.staff_operation(gen_random_uuid(),$2,$1,null,$3,$4) result) select b.* from op cross join lateral jsonb_populate_record(null::public.bookings,op.result) b', [created.id, 'check_in', null, 3]))).rows[0];
    assert.equal(checkedIn.status, 'checked_in'); assert.equal(checkedIn.guest_count, 2); assert.equal(checkedIn.actual_guest_count, 3);
    const completed = (await actor(right, S, c => c.query('with op as materialized (select public.staff_operation(gen_random_uuid(),$2,$1,null,$3,$4) result) select b.* from op cross join lateral jsonb_populate_record(null::public.bookings,op.result) b', [created.id, 'complete', null, null]))).rows[0];
    assert.equal(completed.status, 'completed');
    assert.equal((await admin.query('select status from public.tables where id=$1', [tables[2].id])).rows[0].status, 'cleaning');
    const ready = (await actor(right, S, c => c.query("with op as materialized (select public.staff_operation(gen_random_uuid(),'ready',null,$1) result) select t.* from op cross join lateral jsonb_populate_record(null::public.tables,op.result) t", [tables[2].id]))).rows[0];
    assert.equal(ready.status, 'available');
  });
  await clearBookings();
  await check('Staff rejection, cancellation reason and role denial are enforced', async () => {
    const rejected = (await actor(left, A, c => book(c, args(0)))).rows[0];
    await assert.rejects(actor(right, S, c => c.query('with op as materialized (select public.staff_operation(gen_random_uuid(),$2,$1,null,$3,$4) result) select b.* from op cross join lateral jsonb_populate_record(null::public.bookings,op.result) b', [rejected.id, 'reject', null, null])), /REASON_REQUIRED/);
    const rejection = (await actor(right, S, c => c.query('with op as materialized (select public.staff_operation(gen_random_uuid(),$2,$1,null,$3,$4) result) select b.* from op cross join lateral jsonb_populate_record(null::public.bookings,op.result) b', [rejected.id, 'reject', 'Bàn cần kiểm tra lại', null]))).rows[0];
    assert.equal(rejection.status, 'rejected');
    const cancellable = (await actor(left, A, c => book(c, args(1)))).rows[0];
    await assert.rejects(actor(right, A, c => c.query('with op as materialized (select public.staff_operation(gen_random_uuid(),$2,$1,null,$3,$4) result) select b.* from op cross join lateral jsonb_populate_record(null::public.bookings,op.result) b', [cancellable.id, 'cancel', 'Giả Staff', null])), /STAFF_REQUIRED/);
    const cancelled = (await actor(right, S, c => c.query('with op as materialized (select public.staff_operation(gen_random_uuid(),$2,$1,null,$3,$4) result) select b.* from op cross join lateral jsonb_populate_record(null::public.bookings,op.result) b', [cancellable.id, 'cancel', 'Khách đổi kế hoạch', null]))).rows[0];
    assert.equal(cancelled.status, 'cancelled');
    assert.equal((await admin.query("select source,reason from public.booking_history where booking_id=$1 order by created_at desc limit 1", [cancellable.id])).rows[0].source, 'staff');
  });
  await clearBookings();

  // These fixtures run only inside the guarded empty loopback database.
  async function staffOp(client, actorId, action, bookingId, options = {}) {
    return (await actor(client, actorId, c => c.query(
      'select public.staff_operation($1,$2,$3,$4,$5,$6,$7) result',
      [options.key ?? randomUUID(), action, bookingId, options.table ?? null, options.reason ?? null, options.actual ?? null, options.consent ?? false]
    ))).rows[0].result;
  }
  async function phone(table = 2) {
    return (await actor(left,S,c=>c.query('select * from public.create_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[...args(table),null,'PHASE7 QA','phone',null]))).rows[0];
  }
  async function shift(id, minutes) {
    await admin.query("update public.bookings set starts_at=clock_timestamp()+make_interval(mins=>$2), ends_at=clock_timestamp()+make_interval(mins=>$2+120), blocked_until=clock_timestamp()+make_interval(mins=>$2+135) where id=$1",[id,minutes]);
  }
  await clearBookings();
  await check('Staff receipts preserve retries and deny changed payload without duplicate events', async () => {
    const b=(await actor(left,A,c=>book(c,args(2)))).rows[0], key=randomUUID();
    const confirmed=await staffOp(right,S,'confirm',b.id,{key});
    assert.equal(confirmed.status,'confirmed');
    const before=await eventCounts(b.id);
    assert.deepEqual(await staffOp(right,S,'confirm',b.id,{key}),confirmed);
    assert.deepEqual(await eventCounts(b.id),before);
    await assert.rejects(staffOp(right,S,'cancel',b.id,{key,reason:'Changed request'}),/IDEMPOTENCY_PAYLOAD_MISMATCH/);
    await staffOp(right,S,'cancel',b.id,{reason:'PHASE7 QA'});
    assert.deepEqual(await staffOp(right,S,'confirm',b.id,{key}),confirmed);
    assert.equal((await admin.query('select status from public.bookings where id=$1',[b.id])).rows[0].status,'cancelled');
  });
  await clearBookings();
  await check('Staff check-in boundaries, capacity and late arrival use policy without altering reserved count', async () => {
    const b=await phone();
    await shift(b.id,16);
    await assert.rejects(staffOp(right,S,'check_in',b.id),/CHECKIN_TOO_EARLY/);
    await shift(b.id,14);
    await assert.rejects(staffOp(right,S,'check_in',b.id,{actual:5}),/INVALID_CAPACITY/);
    await shift(b.id,-16);
    const row=await staffOp(right,S,'check_in',b.id,{actual:3});
    assert.equal(row.guest_count,2); assert.equal(row.actual_guest_count,3);
    await assert.rejects(staffOp(right,S,'cancel',b.id,{reason:'Not allowed'}),/INVALID_TRANSITION/);
    await staffOp(right,S,'complete',b.id);
    await staffOp(right,S,'ready',null,{table:tables[2].id});
  });
  await clearBookings();
  await check('Staff movement requires consent, preserves schedule and records one receipt', async () => {
    const b=await phone(), key=randomUUID();
    await assert.rejects(staffOp(right,S,'move',b.id,{table:tables[3].id,reason:'PHASE7 QA'}),/GUEST_CONSENT_REQUIRED/);
    const moved=await staffOp(right,S,'move',b.id,{key,table:tables[3].id,reason:'PHASE7 QA',consent:true});
    assert.equal(moved.table_id,tables[3].id); assert.equal(Date.parse(moved.starts_at),Date.parse(b.starts_at));
    const before=await eventCounts(b.id);
    await staffOp(right,S,'move',b.id,{key,table:tables[3].id,reason:'PHASE7 QA',consent:true});
    assert.deepEqual(await eventCounts(b.id),before);
    assert((await admin.query('select reason from public.booking_history where booking_id=$1 order by created_at desc limit 1',[b.id])).rows[0].reason.includes('Khách đồng ý'));
  });
  await clearBookings();
  await check('Staff no-show boundary and concurrent check-in/no-show have one terminal winner', async () => {
    const b=await phone(); await shift(b.id,-14);
    await assert.rejects(staffOp(right,S,'no_show',b.id,{reason:'PHASE7 QA'}),/NO_SHOW_TOO_EARLY/);
    await shift(b.id,-16);
    const results=await compete(left,right,()=>staffOp(left,S,'check_in',b.id),()=>staffOp(right,D,'no_show',b.id,{reason:'PHASE7 QA'}));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const current=(await admin.query('select status from public.bookings where id=$1',[b.id])).rows[0].status;
    assert(['checked_in','no_show'].includes(current));
    assert.equal((await eventCounts(b.id)).history,2);
    if(current==='checked_in') { await staffOp(right,S,'complete',b.id); await staffOp(right,S,'ready',null,{table:tables[2].id}); }
  });
  await clearBookings();
  await check('Concurrent Staff cancel/check-in has one winner and consistent physical state', async () => {
    const b=await phone(); await shift(b.id,0);
    const results=await compete(left,right,()=>staffOp(left,S,'check_in',b.id),()=>staffOp(right,D,'cancel',b.id,{reason:'PHASE7 QA'}));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const row=(await admin.query('select status from public.bookings where id=$1',[b.id])).rows[0];
    assert.equal((await eventCounts(b.id)).history,2);
    if(row.status==='checked_in') { await staffOp(right,S,'complete',b.id); await staffOp(right,S,'ready',null,{table:tables[2].id}); }
  });
  await clearBookings();
  await check('Overstay cannot be hidden by stale available table state or expired schedule', async () => {
    const first=await phone(); await shift(first.id,-200);
    await staffOp(right,S,'check_in',first.id);
    await admin.query("update public.tables set status='available' where id=$1",[tables[2].id]);
    const second=await phone(); await shift(second.id,0);
    await assert.rejects(staffOp(right,S,'check_in',second.id),/TABLE_STILL_IN_USE/);
    await staffOp(right,S,'complete',first.id);
    await assert.rejects(staffOp(right,S,'check_in',second.id),/TABLE_NOT_READY/);
    await staffOp(right,S,'ready',null,{table:tables[2].id});
    await staffOp(right,S,'cancel',second.id,{reason:'PHASE7 QA'});
  });
  await clearBookings();
  await check('Staff event failure rolls back booking, physical state and receipt atomically', async () => {
    const b=await phone(); await shift(b.id,0); const key=randomUUID();
    const before=await eventCounts(b.id);
    await admin.query("create function private.staff_test_fail() returns trigger language plpgsql as $$ begin raise exception 'TEST_STAFF_EVENT_FAILURE'; end $$; create trigger staff_test_event_failure before insert on public.booking_history for each row execute function private.staff_test_fail()");
    try { await assert.rejects(staffOp(right,S,'check_in',b.id,{key}),/TEST_STAFF_EVENT_FAILURE/); }
    finally { await admin.query('drop trigger staff_test_event_failure on public.booking_history; drop function private.staff_test_fail()'); }
    assert.equal((await admin.query('select status from public.bookings where id=$1',[b.id])).rows[0].status,'confirmed');
    assert.equal((await admin.query('select status from public.tables where id=$1',[tables[2].id])).rows[0].status,'available');
    assert.equal((await admin.query('select count(*)::int n from private.staff_operation_receipts where request_id=$1',[key])).rows[0].n,0);
    assert.deepEqual(await eventCounts(b.id),before);
  });
  await clearBookings();
  await check('Staff RPC denies Guest, Customer and inactive Staff; Admin remains authorized', async () => {
    const b=await phone();
    await assert.rejects(staffOp(right,A,'cancel',b.id,{reason:'PHASE7 QA'}),/STAFF_REQUIRED/);
    await assert.rejects(actor(right,null,c=>c.query("select public.staff_operation($1,'cancel',$2)",[randomUUID(),b.id]),'anon'),e=>e.code==='42501');
    await admin.query('update public.profiles set is_active=false where id=$1',[S]);
    try { await assert.rejects(staffOp(right,S,'cancel',b.id,{reason:'PHASE7 QA'}),/STAFF_REQUIRED/); }
    finally { await admin.query('update public.profiles set is_active=true where id=$1',[S]); }
    assert.equal((await staffOp(right,D,'cancel',b.id,{reason:'PHASE7 QA'})).status,'cancelled');
  });
  await clearBookings();
  await check('Expired pending Staff confirmation commits system expiration instead of resurrecting hold', async () => {
    const b=(await actor(left,A,c=>book(c,args()))).rows[0];
    await admin.query("update public.bookings set expires_at=clock_timestamp()-interval '1 second' where id=$1",[b.id]);
    assert.equal((await staffOp(right,S,'confirm',b.id)).status,'cancelled');
    assert.equal((await eventCounts(b.id)).history,2);
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
