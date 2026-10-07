import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

// Run only against a disposable pre-202610070001 fixture after test:db.
const url = new URL(process.env.TEST_DATABASE_URL ?? 'invalid:');
assert(['postgres:', 'postgresql:'].includes(url.protocol));
assert(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
assert(/^\/mocvi_test_[a-z0-9_]+$/.test(url.pathname));
assert.equal(url.search, '');
const db = new pg.Client({ connectionString: url.href });
await db.connect();
const id = randomUUID();
try {
  await db.query("set statement_timeout='15s'");
  assert.equal((await db.query("select count(*)::int n from pg_constraint where conname='orders_safe_total'")).rows[0].n, 0);
  const booking = (await db.query('select id,customer_id from public.bookings where customer_id is not null and id not in (select booking_id from public.orders) limit 1')).rows[0];
  assert(booking, 'Requires a disposable pre-migration fixture booking');
  await db.query('insert into public.orders(id,booking_id,customer_id,total_amount) values($1,$2,$3,10000000989999999)', [id, booking.id, booking.customer_id]);
  const sql = await readFile(new URL('../supabase/migrations/202610070001_order_catalogue_numeric_safety.sql', import.meta.url), 'utf8');
  await assert.rejects(db.query(sql), error => error.code === '23514');
  await db.query('rollback');
  assert.equal((await db.query('select total_amount from public.orders where id=$1', [id])).rows[0].total_amount, '10000000989999999');
  assert.equal((await db.query("select count(*)::int n from pg_constraint where conname='orders_safe_total'")).rows[0].n, 0);
  await db.query('delete from public.orders where id=$1', [id]);
  await db.query(sql);
  console.log('PASS upgrade refuses unsafe historical row without rewriting it; rollback retains old schema; upgrade succeeds after isolated fixture cleanup');
} finally {
  await db.query('rollback');
  await db.query('delete from public.orders where id=$1', [id]);
  await db.end();
}
