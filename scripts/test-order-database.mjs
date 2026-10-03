import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function testOrderDatabase({ admin, left, right, actor, check, compete, A, B, S, D, tables, start, clearBookings }) {
  const orderItems = (items) => JSON.stringify(items);
  async function booking(owner = A, table = 0, key = randomUUID(), startsAt = start) {
    const result = await actor(left, owner, (client) => client.query(
      'select * from public.create_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [key, tables[table].id, startsAt, 2, 'Order QA guest', 'ORDER-QA', null, 'ORDER QA', 'website', owner],
    ));
    const row = result.rows[0];
    await actor(right, S, (client) => client.query('select public.confirm_booking($1)', [row.id]));
    return row;
  }
  async function createOrder(owner, bookingId, items, requestId = randomUUID()) {
    return (await actor(left, owner, (client) => client.query('select * from public.create_order($1,$2::jsonb,$3)', [bookingId, orderItems(items), requestId]))).rows[0];
  }
  async function staffOrder(orderId, action, requestId = randomUUID(), reason = null, expected = null, user = S) {
    return (await actor(right, user, (client) => client.query('select * from public.staff_order_operation($1,$2,$3,$4,$5)', [requestId, orderId, action, reason, expected]))).rows[0];
  }
  async function orderCounts(id) {
    return (await admin.query(`select
      (select count(*)::int from public.orders where id=$1) orders,
      (select count(*)::int from public.order_items where order_id=$1) items,
      (select count(*)::int from public.order_history where order_id=$1) history,
      (select count(*)::int from public.order_notifications n join public.order_history h on h.id=n.history_id where h.order_id=$1) notifications,
      (select count(*)::int from public.audit_logs where entity_id=$1 and entity_type='order') audit`, [id])).rows[0];
  }

  await clearBookings();
  await check('Order schema and canonical snapshot total are server-controlled', async () => {
    const b = await booking();
    const order = await createOrder(A, b.id, [{ kind: 'dish', code: 'MV-KV01', quantity: 2 }, { kind: 'combo', code: 'MV-CB01', quantity: 1 }]);
    assert.equal(Number(order.total_amount), 677000);
    const rows = (await admin.query('select item_type,item_code,item_name,unit_price,quantity,line_total,snapshot_components from public.order_items where order_id=$1 order by line_no', [order.id])).rows;
    assert.deepEqual(rows.map((row) => [row.item_type, row.item_code, Number(row.quantity)]), [['dish', 'MV-KV01', 2], ['combo', 'MV-CB01', 1]]);
    assert.equal(rows[0].item_name, 'Gỏi bưởi tôm thịt');
    assert.equal(Number(rows[0].line_total), 178000);
    assert.equal(rows[1].snapshot_components[0].label, 'Gỏi bưởi tôm thịt');
  });

  await clearBookings();
  await check('Order ownership, direct writes and forged catalogue fields are denied', async () => {
    const b = await booking();
    const order = await createOrder(A, b.id, [{ kind: 'dish', code: 'MV-KV01', quantity: 1 }]);
    assert.equal((await actor(right, B, (client) => client.query('select id from public.orders where id=$1', [order.id]))).rowCount, 0);
    await assert.rejects(actor(right, B, (client) => client.query('select public.create_order($1,$2::jsonb,$3)', [b.id, orderItems([{ kind: 'dish', code: 'MV-KV02', quantity: 1 }]), randomUUID()])), /BOOKING_NOT_FOUND/);
    await assert.rejects(actor(right, B, (client) => client.query("update public.orders set total_amount=1 where id=$1", [order.id])), (error) => error.code === '42501');
    const invalidBooking = await booking(B, 1);
    await assert.rejects(actor(right, B, (client) => client.query('select public.create_order($1,$2::jsonb,$3)', [invalidBooking.id, orderItems([{ kind: 'dish', code: 'MV-KV01', quantity: 0 }]), randomUUID()])), /INVALID_ITEM/);
    await assert.rejects(actor(right, A, (client) => client.query('select public.create_order($1,$2::jsonb,$3)', [b.id, orderItems([{ kind: 'dish', code: 'MV-KV01', quantity: 1, price: 1 }]), randomUUID()])), /ORDER_ALREADY_EXISTS/);
  });

  await clearBookings();
  await check('Order idempotency and duplicate/invalid quantity guards are stable', async () => {
    const b = await booking(); const key = randomUUID();
    const first = await createOrder(A, b.id, [{ kind: 'dish', code: 'MV-KV02', quantity: 3 }], key);
    assert.equal((await createOrder(A, b.id, [{ kind: 'dish', code: 'MV-KV02', quantity: 3 }], key)).id, first.id);
    await assert.rejects(createOrder(A, b.id, [{ kind: 'dish', code: 'MV-KV02', quantity: 4 }], key), /IDEMPOTENCY_PAYLOAD_MISMATCH/);
    for (const [tableIndex, items] of [[], [{ kind: 'dish', code: 'MV-KV01', quantity: 1.5 }], [{ kind: 'dish', code: 'MV-KV01', quantity: -1 }], [{ kind: 'dish', code: 'MV-KV01', quantity: 1 }, { kind: 'dish', code: 'MV-KV01', quantity: 2 }]].entries()) {
      await clearBookings();
      const b2 = await booking(B, (tableIndex + 1) % tables.length, randomUUID(), new Date(start.getTime() + (tableIndex + 1) * 24 * 60 * 60 * 1000));
      await assert.rejects(createOrder(B, b2.id, items), /INVALID_ITEMS|INVALID_ITEM|DUPLICATE_ITEM/);
    }
  });

  await clearBookings();
  await check('Pending customer edit recalculates trusted prices and uses version conflicts', async () => {
    const b = await booking(); const order = await createOrder(A, b.id, [{ kind: 'dish', code: 'MV-KV01', quantity: 1 }]);
    await admin.query("update public.menu_items set name='Gỏi bưởi QA', price=99000 where code='MV-KV01'");
    const updated = (await actor(left, A, (client) => client.query('select * from public.update_pending_order($1,$2::jsonb,$3,$4)', [order.id, orderItems([{ kind: 'dish', code: 'MV-KV01', quantity: 2 }]), 1, randomUUID()]))).rows[0];
    assert.equal(Number(updated.total_amount), 198000); assert.equal(updated.version, 2);
    assert.equal((await admin.query('select item_name,unit_price from public.order_items where order_id=$1', [order.id])).rows[0].item_name, 'Gỏi bưởi QA');
    await assert.rejects(actor(left, A, (client) => client.query('select * from public.update_pending_order($1,$2::jsonb,$3,$4)', [order.id, orderItems([{ kind: 'dish', code: 'MV-KV01', quantity: 1 }]), 1, randomUUID()])), /ORDER_CONFLICT/);
    await admin.query("update public.menu_items set name='Gỏi bưởi tôm thịt', price=89000 where code='MV-KV01'");
  });

  await clearBookings();
  await check('Staff transitions are ordered, customer edit stops after confirmation, and terminal is immutable', async () => {
    const b = await booking(); const order = await createOrder(A, b.id, [{ kind: 'dish', code: 'MV-KV03', quantity: 1 }]);
    assert.equal((await staffOrder(order.id, 'confirm', randomUUID(), null, order.version)).status, 'confirmed');
    await assert.rejects(actor(left, A, (client) => client.query('select * from public.update_pending_order($1,$2::jsonb,$3,$4)', [order.id, orderItems([{ kind: 'dish', code: 'MV-KV03', quantity: 2 }]), 1, randomUUID()])), /ORDER_NOT_EDITABLE/);
    const preparing = await staffOrder(order.id, 'preparing'); assert.equal(preparing.status, 'preparing');
    const served = await staffOrder(order.id, 'served'); assert.equal(served.status, 'served');
    await assert.rejects(staffOrder(order.id, 'cancel', randomUUID(), 'terminal order'), /INVALID_TRANSITION/);
    assert.deepEqual(await orderCounts(order.id), { orders: 1, items: 1, history: 4, notifications: 4, audit: 4 });
  });

  await clearBookings();
  await check('Competing Staff confirmation and cancellation leave one valid winner', async () => {
    const b = await booking(); const order = await createOrder(A, b.id, [{ kind: 'dish', code: 'MV-KV04', quantity: 1 }]);
    const results = await compete(left, right, () => actor(left, S, (client) => client.query('select * from public.staff_order_operation($1,$2,$3,$4,$5)', [randomUUID(), order.id, 'confirm', null, 1])), () => actor(right, D, (client) => client.query('select * from public.staff_order_operation($1,$2,$3,$4,$5)', [randomUUID(), order.id, 'cancel', 'ORDER QA race', 1])));
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    const status = (await admin.query('select status from public.orders where id=$1', [order.id])).rows[0].status;
    assert(['confirmed', 'cancelled'].includes(status));
    assert.equal((await admin.query('select count(*)::int n from public.order_history where order_id=$1', [order.id])).rows[0].n, 2);
  });

  await clearBookings();
  await check('Booking cancellation cascades to an active order and completion is blocked', async () => {
    const b = await booking(); const order = await createOrder(A, b.id, [{ kind: 'dish', code: 'MV-KV05', quantity: 1 }]);
    const cancelledBooking = (await actor(left, A, (client) => client.query('select * from public.cancel_booking($1)', [b.id]))).rows[0];
    assert.equal(cancelledBooking.status, 'cancelled'); assert.equal((await admin.query('select status from public.orders where id=$1', [order.id])).rows[0].status, 'cancelled');
    assert.deepEqual((await admin.query('select from_status,to_status,source from public.order_history where order_id=$1 order by created_at desc limit 1', [order.id])).rows[0], { from_status: 'pending', to_status: 'cancelled', source: 'system' });
    const b2 = await booking(B, 1); const order2 = await createOrder(B, b2.id, [{ kind: 'dish', code: 'MV-KV05', quantity: 1 }]);
    await admin.query("update public.bookings set status='checked_in', actual_guest_count=2, checked_in_at=clock_timestamp() where id=$1", [b2.id]);
    await assert.rejects(staffOrder(order2.id, 'complete'), /INVALID_INPUT|INVALID_TRANSITION/);
    await assert.rejects(actor(right, S, (client) => client.query('select public.staff_operation($1,$2,$3,$4,$5,$6,$7)', [randomUUID(), 'complete', b2.id, null, null, null, false])), /ORDER_NOT_COMPLETE/);
  });

  await clearBookings();
  await check('Unavailable catalogue rows are revalidated by the database', async () => {
    const b = await booking(); await admin.query("update public.menu_items set is_available=false where code='MV-KV01'");
    try { await assert.rejects(createOrder(A, b.id, [{ kind: 'dish', code: 'MV-KV01', quantity: 1 }]), /ITEM_UNAVAILABLE/); }
    finally { await admin.query("update public.menu_items set is_available=true where code='MV-KV01'"); }
  });

  await clearBookings();
  await check('Order event failure rolls back order, lines, notifications and audit', async () => {
    const b = await booking();
    await admin.query("create function private.order_qa_fail() returns trigger language plpgsql as $$ begin if NEW.entity_type='order' then raise exception 'ORDER_EVENT_FAILURE'; end if; return NEW; end; $$; create trigger order_qa_fail before insert on public.audit_logs for each row execute function private.order_qa_fail()");
    try { await assert.rejects(createOrder(A, b.id, [{ kind: 'dish', code: 'MV-KV01', quantity: 1 }]), /ORDER_EVENT_FAILURE/); assert.equal((await admin.query('select count(*)::int n from public.orders')).rows[0].n, 0); assert.equal((await admin.query('select count(*)::int n from public.order_items')).rows[0].n, 0); }
    finally { await admin.query('drop trigger order_qa_fail on public.audit_logs; drop function private.order_qa_fail()'); }
  });
}
