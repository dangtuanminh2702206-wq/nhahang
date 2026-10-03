begin;

create type public.order_status as enum ('pending', 'confirmed', 'preparing', 'served', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'pending',
  total_amount numeric(18,0) not null default 0 check (total_amount >= 0 and total_amount <= 999999999999999999),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index orders_customer_idx on public.orders(customer_id, created_at desc);
create index orders_status_idx on public.orders(status, updated_at);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  line_no integer not null check (line_no > 0),
  item_type text not null check (item_type in ('dish', 'combo')),
  item_code text not null check (item_code ~ '^MV-[A-Z0-9-]{1,30}$'),
  item_name text not null check (length(btrim(item_name)) between 1 and 160),
  unit_price numeric(12,0) not null check (unit_price >= 0 and unit_price <= 1000000000),
  quantity integer not null check (quantity > 0),
  line_total numeric(18,0) not null check (line_total >= 0 and line_total <= 999999999999999999),
  snapshot_components jsonb not null default '[]'::jsonb check (jsonb_typeof(snapshot_components) = 'array'),
  unique (order_id, line_no),
  unique (order_id, item_type, item_code)
);
create index order_items_order_idx on public.order_items(order_id, line_no);

create table public.order_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete restrict,
  from_status public.order_status,
  to_status public.order_status not null,
  reason text check (reason is null or length(reason) <= 500),
  source text not null check (source in ('customer', 'staff', 'system')),
  created_at timestamptz not null default clock_timestamp()
);
create index order_history_order_idx on public.order_history(order_id, created_at);

create table public.order_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  history_id uuid not null unique references public.order_history(id) on delete restrict,
  read_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
create index order_notifications_recipient_idx on public.order_notifications(recipient_id, created_at desc);

create table private.order_mutation_receipts (
  actor_id uuid not null references public.profiles(id),
  request_id uuid not null,
  operation text not null,
  payload jsonb not null,
  response jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (actor_id, request_id)
);
revoke all on private.order_mutation_receipts from public, anon, authenticated;

create function private.record_order_event(
  p_id uuid,
  p_actor uuid,
  p_from public.order_status,
  p_to public.order_status,
  p_reason text,
  p_source text
) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_history uuid;
  v_customer uuid;
begin
  insert into public.order_history(order_id, actor_id, from_status, to_status, reason, source)
  values (p_id, p_actor, p_from, p_to, p_reason, p_source)
  returning id into v_history;

  select customer_id into v_customer from public.orders where id = p_id;
  if v_customer is not null then
    insert into public.order_notifications(recipient_id, history_id) values (v_customer, v_history);
  end if;

  insert into public.audit_logs(actor_id, entity_id, entity_type, action, details)
  values (p_actor, p_id, 'order', p_to::text,
    jsonb_build_object('from', p_from, 'to', p_to, 'source', p_source, 'reason', p_reason));
end;
$$;

create function private.replace_order_items(p_order_id uuid, p_items jsonb)
returns numeric
language plpgsql
set search_path = ''
as $$
declare
  v_item jsonb;
  v_kind text;
  v_code text;
  v_quantity integer;
  v_key text;
  v_line integer := 0;
  v_total numeric(18,0) := 0;
  v_price numeric(12,0);
  v_name text;
  v_components jsonb;
  v_menu public.menu_items;
  v_combo public.menu_combos;
  v_seen text[] := array[]::text[];
  v_line_total numeric(18,0);
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'INVALID_ITEMS';
  end if;

  delete from public.order_items where order_id = p_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
      or not (v_item ?& array['kind','code','quantity'])
      or exists (select 1 from jsonb_object_keys(v_item) as key where key not in ('kind','code','quantity'))
      or jsonb_typeof(v_item->'kind') <> 'string'
      or jsonb_typeof(v_item->'code') <> 'string'
      or jsonb_typeof(v_item->'quantity') <> 'number'
      or (v_item->>'quantity') !~ '^[0-9]+$'
    then
      raise exception 'INVALID_ITEM';
    end if;

    v_kind := v_item->>'kind';
    v_code := btrim(v_item->>'code');
    v_quantity := (v_item->>'quantity')::integer;
    if v_kind not in ('dish', 'combo') or v_code !~ '^MV-[A-Z0-9-]{1,30}$' or v_quantity < 1 then
      raise exception 'INVALID_ITEM';
    end if;
    v_key := v_kind || ':' || v_code;
    if v_key = any(v_seen) then raise exception 'DUPLICATE_ITEM'; end if;
    v_seen := array_append(v_seen, v_key);

    if v_kind = 'dish' then
      select * into v_menu from public.menu_items where code = v_code and is_active and is_available for share;
      if not found then raise exception 'ITEM_UNAVAILABLE'; end if;
      v_name := v_menu.name;
      v_price := v_menu.price;
      v_components := '[]'::jsonb;
    else
      select * into v_combo from public.menu_combos where code = v_code and is_active and is_available for share;
      if not found then raise exception 'ITEM_UNAVAILABLE'; end if;
      v_name := v_combo.name;
      v_price := v_combo.price;
      v_components := v_combo.components;
    end if;

    v_line := v_line + 1;
    v_line_total := v_price * v_quantity;
    v_total := v_total + v_line_total;
    if v_line_total > 999999999999999999 or v_total > 999999999999999999 then
      raise exception 'TOTAL_TOO_LARGE';
    end if;
    insert into public.order_items(order_id, line_no, item_type, item_code, item_name, unit_price, quantity, line_total, snapshot_components)
    values (p_order_id, v_line, v_kind, v_code, v_name, v_price, v_quantity, v_line_total, v_components);
  end loop;
  return v_total;
end;
$$;

create function public.create_order(p_booking_id uuid, p_items jsonb, p_request_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role public.app_role;
  v_booking public.bookings;
  v_order public.orders;
  v_receipt private.order_mutation_receipts;
  v_payload jsonb;
  v_total numeric(18,0);
begin
  perform private.lock_booking_writes();
  select role into v_role from public.profiles where id = v_actor and is_active for share;
  if v_role is distinct from 'customer' then raise exception 'CUSTOMER_REQUIRED' using errcode = '42501'; end if;
  if p_booking_id is null or p_request_id is null then raise exception 'INVALID_INPUT'; end if;
  v_payload := jsonb_build_object('booking_id', p_booking_id, 'items', p_items);

  select * into v_receipt from private.order_mutation_receipts
  where actor_id = v_actor and request_id = p_request_id for update;
  if found then
    if v_receipt.operation <> 'create' or v_receipt.payload <> v_payload then raise exception 'IDEMPOTENCY_PAYLOAD_MISMATCH'; end if;
    select * into v_order from jsonb_populate_record(null::public.orders, v_receipt.response);
    return v_order;
  end if;

  select * into v_booking from public.bookings where id = p_booking_id and customer_id = v_actor for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_booking.status not in ('confirmed', 'checked_in') or v_booking.ends_at <= clock_timestamp() then
    raise exception 'BOOKING_NOT_ORDERABLE';
  end if;
  select * into v_order from public.orders where booking_id = p_booking_id for update;
  if found then raise exception 'ORDER_ALREADY_EXISTS'; end if;

  insert into public.orders(booking_id, customer_id) values (p_booking_id, v_actor) returning * into v_order;
  v_total := private.replace_order_items(v_order.id, p_items);
  update public.orders set total_amount = v_total, updated_at = clock_timestamp() where id = v_order.id returning * into v_order;
  perform private.record_order_event(v_order.id, v_actor, null, 'pending', null, 'customer');
  insert into private.order_mutation_receipts(actor_id, request_id, operation, payload, response)
  values (v_actor, p_request_id, 'create', v_payload, to_jsonb(v_order));
  return v_order;
end;
$$;

create function public.update_pending_order(p_order_id uuid, p_items jsonb, p_expected_version integer, p_request_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role public.app_role;
  v_order public.orders;
  v_receipt private.order_mutation_receipts;
  v_payload jsonb;
  v_total numeric(18,0);
begin
  perform private.lock_booking_writes();
  select role into v_role from public.profiles where id = v_actor and is_active for share;
  if v_role is distinct from 'customer' then raise exception 'CUSTOMER_REQUIRED' using errcode = '42501'; end if;
  if p_order_id is null or p_expected_version is null or p_expected_version < 1 or p_request_id is null then raise exception 'INVALID_INPUT'; end if;
  v_payload := jsonb_build_object('order_id', p_order_id, 'items', p_items, 'expected_version', p_expected_version);
  select * into v_receipt from private.order_mutation_receipts where actor_id = v_actor and request_id = p_request_id for update;
  if found then
    if v_receipt.operation <> 'update' or v_receipt.payload <> v_payload then raise exception 'IDEMPOTENCY_PAYLOAD_MISMATCH'; end if;
    select * into v_order from jsonb_populate_record(null::public.orders, v_receipt.response); return v_order;
  end if;
  select * into v_order from public.orders where id = p_order_id and customer_id = v_actor for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'pending' then raise exception 'ORDER_NOT_EDITABLE'; end if;
  if v_order.version <> p_expected_version then raise exception 'ORDER_CONFLICT'; end if;
  v_total := private.replace_order_items(v_order.id, p_items);
  update public.orders set total_amount = v_total, version = version + 1, updated_at = clock_timestamp() where id = v_order.id returning * into v_order;
  perform private.record_order_event(v_order.id, v_actor, 'pending', 'pending', 'customer_updated', 'customer');
  insert into private.order_mutation_receipts(actor_id, request_id, operation, payload, response)
  values (v_actor, p_request_id, 'update', v_payload, to_jsonb(v_order));
  return v_order;
end;
$$;

create function public.cancel_pending_order(p_order_id uuid, p_request_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role public.app_role;
  v_order public.orders;
  v_receipt private.order_mutation_receipts;
  v_payload jsonb;
begin
  perform private.lock_booking_writes();
  select role into v_role from public.profiles where id = v_actor and is_active for share;
  if v_role is distinct from 'customer' then raise exception 'CUSTOMER_REQUIRED' using errcode = '42501'; end if;
  if p_order_id is null or p_request_id is null then raise exception 'INVALID_INPUT'; end if;
  v_payload := jsonb_build_object('order_id', p_order_id);
  select * into v_receipt from private.order_mutation_receipts where actor_id = v_actor and request_id = p_request_id for update;
  if found then
    if v_receipt.operation <> 'cancel' or v_receipt.payload <> v_payload then raise exception 'IDEMPOTENCY_PAYLOAD_MISMATCH'; end if;
    select * into v_order from jsonb_populate_record(null::public.orders, v_receipt.response); return v_order;
  end if;
  select * into v_order from public.orders where id = p_order_id and customer_id = v_actor for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status = 'cancelled' then return v_order; end if;
  if v_order.status <> 'pending' then raise exception 'ORDER_NOT_EDITABLE'; end if;
  update public.orders set status = 'cancelled', version = version + 1, updated_at = clock_timestamp() where id = v_order.id returning * into v_order;
  perform private.record_order_event(v_order.id, v_actor, 'pending', 'cancelled', 'customer_cancelled', 'customer');
  insert into private.order_mutation_receipts(actor_id, request_id, operation, payload, response)
  values (v_actor, p_request_id, 'cancel', v_payload, to_jsonb(v_order));
  return v_order;
end;
$$;

create function public.staff_order_operation(p_request_id uuid, p_order_id uuid, p_action text, p_reason text default null, p_expected_version integer default null)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role public.app_role;
  v_order public.orders;
  v_receipt private.order_mutation_receipts;
  v_payload jsonb;
  v_from public.order_status;
  v_to public.order_status;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  perform private.lock_booking_writes();
  select role into v_role from public.profiles where id = v_actor and is_active for share;
  if v_role not in ('staff', 'admin') or v_role is null then raise exception 'STAFF_REQUIRED' using errcode = '42501'; end if;
  if p_request_id is null or p_order_id is null or p_action not in ('confirm', 'preparing', 'served', 'cancel') then raise exception 'INVALID_INPUT'; end if;
  if p_action = 'cancel' and (v_reason is null or length(v_reason) > 500) then raise exception 'REASON_REQUIRED'; end if;
  v_payload := jsonb_build_object('order_id', p_order_id, 'action', p_action, 'reason', v_reason, 'expected_version', p_expected_version);
  select * into v_receipt from private.order_mutation_receipts where actor_id = v_actor and request_id = p_request_id for update;
  if found then
    if v_receipt.operation <> 'staff' or v_receipt.payload <> v_payload then raise exception 'IDEMPOTENCY_PAYLOAD_MISMATCH'; end if;
    select * into v_order from jsonb_populate_record(null::public.orders, v_receipt.response); return v_order;
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if p_expected_version is not null and v_order.version <> p_expected_version then raise exception 'ORDER_CONFLICT'; end if;
  v_from := v_order.status;
  v_to := case p_action when 'confirm' then 'confirmed' when 'preparing' then 'preparing' when 'served' then 'served' else 'cancelled' end;
  if v_order.status = v_to then return v_order; end if;
  if p_action = 'confirm' and v_order.status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
  if p_action = 'preparing' and v_order.status <> 'confirmed' then raise exception 'INVALID_TRANSITION'; end if;
  if p_action = 'served' and v_order.status <> 'preparing' then raise exception 'INVALID_TRANSITION'; end if;
  if p_action = 'cancel' and v_order.status not in ('pending','confirmed','preparing') then raise exception 'INVALID_TRANSITION'; end if;
  update public.orders set status = v_to, version = version + 1, updated_at = clock_timestamp() where id = v_order.id returning * into v_order;
  perform private.record_order_event(v_order.id, v_actor, v_from, v_to, v_reason, 'staff');
  insert into private.order_mutation_receipts(actor_id, request_id, operation, payload, response)
  values (v_actor, p_request_id, 'staff', v_payload, to_jsonb(v_order));
  return v_order;
end;
$$;

create function private.prevent_booking_completion_with_order()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed'
     and exists (select 1 from public.orders where booking_id = new.id and status not in ('served', 'cancelled')) then
    raise exception 'ORDER_NOT_COMPLETE';
  end if;
  return new;
end;
$$;
create trigger booking_requires_finished_order
before update of status on public.bookings
for each row execute function private.prevent_booking_completion_with_order();

create function private.cancel_order_after_booking_terminal()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_from public.order_status;
  v_reason text := coalesce(nullif(btrim(new.reason), ''), 'booking_' || new.status::text);
begin
  if new.status in ('cancelled', 'rejected', 'no_show') and old.status is distinct from new.status then
    for v_order_id, v_from in
      select id, status from public.orders
      where booking_id = new.id and status not in ('served', 'cancelled')
      for update
    loop
      update public.orders set status = 'cancelled', version = version + 1, updated_at = clock_timestamp()
      where id = v_order_id;
      perform private.record_order_event(v_order_id, null, v_from, 'cancelled', v_reason, 'system');
    end loop;
  end if;
  return new;
end;
$$;
create trigger booking_cancels_active_order
after update of status on public.bookings
for each row execute function private.cancel_order_after_booking_terminal();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_history enable row level security;
alter table public.order_notifications enable row level security;
revoke all on public.orders, public.order_items, public.order_history, public.order_notifications from public, anon, authenticated;
grant select on public.orders, public.order_items, public.order_history, public.order_notifications to authenticated;

create policy orders_read on public.orders for select to authenticated using
  (private.current_role() is not null and (customer_id = auth.uid() or private.current_role() in ('staff','admin')));
create policy order_items_read on public.order_items for select to authenticated using
  (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or private.current_role() in ('staff','admin'))));
create policy order_history_read on public.order_history for select to authenticated using
  (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or private.current_role() in ('staff','admin'))));
create policy order_notifications_read on public.order_notifications for select to authenticated using
  (recipient_id = auth.uid() and private.current_role() is not null);
create policy order_notifications_edit on public.order_notifications for update to authenticated
  using (recipient_id = auth.uid() and private.current_role() is not null)
  with check (recipient_id = auth.uid() and private.current_role() is not null);

revoke all on function public.create_order(uuid,jsonb,uuid) from public, anon, authenticated;
revoke all on function public.update_pending_order(uuid,jsonb,integer,uuid) from public, anon, authenticated;
revoke all on function public.cancel_pending_order(uuid,uuid) from public, anon, authenticated;
revoke all on function public.staff_order_operation(uuid,uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.create_order(uuid,jsonb,uuid) to authenticated;
grant execute on function public.update_pending_order(uuid,jsonb,integer,uuid) to authenticated;
grant execute on function public.cancel_pending_order(uuid,uuid) to authenticated;
grant execute on function public.staff_order_operation(uuid,uuid,text,text,integer) to authenticated;

commit;
