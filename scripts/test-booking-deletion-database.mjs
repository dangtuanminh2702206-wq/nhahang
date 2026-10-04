import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function testBookingDeletionDatabase({ admin, left, right, actor, check, compete, A, S, D, tables, start, clearBookings }) {
  await clearBookings();
  await admin.query('update public.profiles set is_active=true where id=$1', [A]);
  async function fixture(withOrder = false) {
    const b = (await actor(left, A, c => c.query('select * from public.create_booking($1,$2,$3,$4,$5,$6)', [randomUUID(), tables[0].id, start, 2, 'DELETE QA', 'TEST-PHONE']))).rows[0];
    if (withOrder) {
      await actor(right, S, c => c.query('select public.confirm_booking($1)', [b.id]));
      await actor(left, A, c => c.query('select public.create_order($1,$2::jsonb,$3)', [b.id, JSON.stringify([{ kind: 'dish', code: 'MV-KV01', quantity: 1 }]), randomUUID()]));
    }
    await admin.query("update public.bookings set status='cancelled', cancellation_source='staff', reason='DELETE QA', expires_at=null, starts_at=clock_timestamp()-interval '2 days', ends_at=clock_timestamp()-interval '1 day', blocked_until=clock_timestamp()-interval '1 day' where id=$1", [b.id]);
    return (await admin.query('select *, updated_at::text as updated_at from public.bookings where id=$1', [b.id])).rows[0];
  }
  function remove(client, user, b, expected = b.updated_at, confirmation = b.id, reason = 'DELETE QA') {
    return actor(client, user, c => c.query('select public.admin_delete_booking($1,$2,$3,$4)', [b.id, expected, confirmation, reason]));
  }
  await check('Booking purge denies Guest/Customer/Staff/inactive Admin and rejects direct delete', async () => {
    const b = await fixture();
    for (const user of [A, S]) await assert.rejects(remove(left, user, b), /ADMIN_REQUIRED/);
    await assert.rejects(actor(left, null, c => c.query('select public.admin_delete_booking($1,$2,$3,$4)', [b.id, b.updated_at, b.id, 'QA']), 'anon'), e => e.code === '42501');
    await assert.rejects(actor(left, D, c => c.query('delete from public.bookings where id=$1', [b.id])), e => e.code === '42501');
    await admin.query('update public.profiles set is_active=false where id=$1', [D]);
    try { await assert.rejects(remove(left, D, b), /ADMIN_REQUIRED/); }
    finally { await admin.query('update public.profiles set is_active=true where id=$1', [D]); }
    await remove(left, D, b);
  });
  await check('Booking purge requires exact confirmation, reason, snapshot and past terminal status', async () => {
    const b = await fixture();
    await assert.rejects(remove(left, D, b, null), /ADMIN_CONFLICT/);
    await assert.rejects(remove(left, D, b, '2000-01-01T00:00:00Z'), /ADMIN_CONFLICT/);
    await assert.rejects(remove(left, D, b, b.updated_at, 'wrong'), /DELETE_CONFIRMATION_REQUIRED/);
    await assert.rejects(remove(left, D, b, b.updated_at, b.id, ' '), /REASON_REQUIRED/);
    await admin.query("update public.bookings set status='confirmed' where id=$1", [b.id]);
    let fresh = (await admin.query('select *, updated_at::text as updated_at from public.bookings where id=$1', [b.id])).rows[0];
    await assert.rejects(remove(left, D, fresh), /BOOKING_NOT_DELETABLE/);
    await admin.query("update public.bookings set status='cancelled', ends_at=clock_timestamp()+interval '1 day', blocked_until=clock_timestamp()+interval '1 day' where id=$1", [b.id]);
    fresh = (await admin.query('select *, updated_at::text as updated_at from public.bookings where id=$1', [b.id])).rows[0];
    await assert.rejects(remove(left, D, fresh), /BOOKING_NOT_DELETABLE/);
    await clearBookings();
  });
  await check('Booking purge removes dependent order/history/notifications atomically; audit and unrelated records survive', async () => {
    const b = await fixture(true);
    const order = (await admin.query('select * from public.orders where booking_id=$1', [b.id])).rows[0];
    const histories = (await admin.query('select id from public.booking_history where booking_id=$1', [b.id])).rows.map(row => row.id);
    const orderHistories = (await admin.query('select id from public.order_history where order_id=$1', [order.id])).rows.map(row => row.id);
    const unrelated = await fixture();
    const tableCount = (await admin.query('select count(*)::int n from public.tables')).rows[0].n;
    await admin.query("update public.orders set status='pending' where id=$1", [order.id]);
    await assert.rejects(remove(left, D, b), /ORDER_NOT_FINISHED/);
    await admin.query("update public.orders set status='cancelled' where id=$1", [order.id]);
    const before = (await admin.query('select count(*)::int n from public.audit_logs')).rows[0].n;
    // A failing audit must roll back the destructive operation.
    await admin.query("create function public.qa_deny_delete_audit() returns trigger language plpgsql as $$ begin if new.action='delete' then raise exception 'QA_AUDIT_FAILURE'; end if; return new; end $$; create trigger qa_deny_delete_audit before insert on public.audit_logs for each row execute function public.qa_deny_delete_audit()");
    try { await assert.rejects(remove(left, D, b), /QA_AUDIT_FAILURE/); assert.equal((await admin.query('select id from public.bookings where id=$1', [b.id])).rowCount, 1); assert.equal((await admin.query('select id from public.orders where id=$1', [order.id])).rowCount, 1); }
    finally { await admin.query('drop trigger qa_deny_delete_audit on public.audit_logs; drop function public.qa_deny_delete_audit()'); }
    await remove(left, D, b);
    for (const [table, key, value] of [['bookings', 'id', b.id], ['booking_history', 'booking_id', b.id], ['orders', 'id', order.id], ['order_items', 'order_id', order.id], ['order_history', 'order_id', order.id]]) assert.equal((await admin.query(`select 1 from public.${table} where ${key}=$1`, [value])).rowCount, 0);
    assert.equal((await admin.query('select count(*)::int n from public.audit_logs')).rows[0].n, before + 1);
    assert.equal((await admin.query('select 1 from public.notifications where history_id=any($1::uuid[])', [histories])).rowCount, 0);
    assert.equal((await admin.query('select 1 from public.order_notifications where history_id=any($1::uuid[])', [orderHistories])).rowCount, 0);
    assert.equal((await admin.query('select id from public.bookings where id=$1', [unrelated.id])).rowCount, 1);
    assert.equal((await admin.query('select count(*)::int n from public.tables')).rows[0].n, tableCount);
    assert.equal((await admin.query('select count(*)::int n from private.order_mutation_receipts')).rows[0].n > 0, true);
  });
  await check('Concurrent booking purges serialize and record only one deletion audit', async () => {
    const b = await fixture();
    const results = await compete(left, right, () => remove(left, D, b), () => remove(right, D, b));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal((await admin.query("select 1 from public.audit_logs where entity_id=$1 and action='delete'", [b.id])).rowCount, 1);
  });
}
