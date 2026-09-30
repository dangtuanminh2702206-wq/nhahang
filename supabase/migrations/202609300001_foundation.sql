begin;

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
set local search_path = public, extensions;

create type public.app_role as enum ('customer', 'staff', 'admin');
create type public.booking_status as enum
  ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'rejected', 'no_show');
create type public.table_status as enum ('available', 'occupied', 'cleaning', 'out_of_service');
create type public.booking_source as enum ('website', 'phone', 'walk_in');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null default '' check (length(full_name) <= 120),
  phone text check (length(phone) <= 32),
  role public.app_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Singleton: the only authoritative source for booking policy numbers.
create table public.restaurant_settings (
  id boolean primary key default true check (id),
  name text not null default 'Mộc Vị Restaurant',
  timezone text not null default 'Asia/Ho_Chi_Minh' check (timezone = 'Asia/Ho_Chi_Minh'),
  duration_minutes integer not null default 120 check (duration_minutes > 0),
  buffer_minutes integer not null default 15 check (buffer_minutes >= 0),
  min_notice_minutes integer not null default 60 check (min_notice_minutes >= 0),
  max_advance_days integer not null default 30 check (max_advance_days > 0),
  pending_minutes integer not null default 30 check (pending_minutes > 0),
  cancellation_minutes integer not null default 60 check (cancellation_minutes >= 0),
  early_checkin_minutes integer not null default 15 check (early_checkin_minutes >= 0),
  no_show_minutes integer not null default 15 check (no_show_minutes >= 0),
  max_active_bookings integer not null default 3 check (max_active_bookings > 0),
  max_guests integer not null default 8 check (max_guests between 1 and 8),
  check (pending_minutes <= min_notice_minutes)
);
insert into public.restaurant_settings(id) values (true);

-- Multiple service windows per weekday; overnight windows intentionally unsupported.
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  check (opens_at < closes_at),
  unique (weekday, opens_at)
);
create table public.closure_dates (
  closed_on date primary key,
  reason text not null check (length(btrim(reason)) between 1 and 500)
);
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true
);
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  area_id uuid not null references public.areas(id) on delete restrict,
  capacity smallint not null check (capacity between 1 and 8),
  status public.table_status not null default 'available',
  is_active boolean not null default true,
  description text not null default ''
);
create index tables_area_idx on public.tables(area_id);
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  category_id uuid not null references public.menu_categories(id) on delete restrict,
  name text not null,
  description text not null default '',
  price numeric(12,0) not null check (price >= 0),
  image_path text,
  is_available boolean not null default true,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0
);
create index menu_items_category_idx on public.menu_items(category_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  idempotency_key uuid not null,
  request_payload jsonb not null,
  table_id uuid not null references public.tables(id) on delete restrict,
  source public.booking_source not null,
  status public.booking_status not null,
  contact_name text not null check (length(btrim(contact_name)) between 1 and 120),
  contact_phone text not null check (length(btrim(contact_phone)) between 1 and 32),
  contact_email text check (length(contact_email) <= 254),
  notes text not null default '' check (length(notes) <= 1000),
  guest_count smallint not null check (guest_count between 1 and 8),
  starts_at timestamptz not null check (isfinite(starts_at)),
  ends_at timestamptz not null check (isfinite(ends_at)),
  blocked_until timestamptz not null check (isfinite(blocked_until)),
  reserved_period tstzrange generated always as (tstzrange(starts_at, blocked_until, '[)')) stored,
  service_period tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  expires_at timestamptz,
  actual_guest_count smallint check (actual_guest_count between 1 and 8),
  checked_in_at timestamptz,
  completed_at timestamptz,
  cancellation_source text check (cancellation_source in ('customer', 'staff', 'system')),
  reason text check (length(reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, idempotency_key),
  check (starts_at < ends_at and ends_at <= blocked_until),
  check (source <> 'website' or customer_id is not null),
  check (status <> 'pending' or expires_at is not null),
  check (expires_at is null or (isfinite(expires_at) and expires_at <= starts_at)),
  check (status <> 'cancelled' or (cancellation_source is not null and reason is not null and length(btrim(reason)) > 0)),
  check (status <> 'rejected' or (reason is not null and length(btrim(reason)) > 0)),
  check (status not in ('checked_in', 'completed') or (actual_guest_count is not null and checked_in_at is not null)),
  check (status <> 'completed' or (completed_at is not null and completed_at >= checked_in_at)),
  exclude using gist (table_id with =, reserved_period with &&)
    where (status in ('pending', 'confirmed', 'checked_in')),
  exclude using gist (customer_id with =, service_period with &&)
    where (customer_id is not null and status in ('pending', 'confirmed', 'checked_in'))
);
create index bookings_customer_idx on public.bookings(customer_id, starts_at);
create index bookings_start_idx on public.bookings(starts_at);
create index bookings_pending_expiry_idx on public.bookings(expires_at) where status = 'pending';
create table public.booking_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete restrict,
  from_status public.booking_status,
  to_status public.booking_status not null,
  reason text,
  source text not null check (source in ('customer', 'staff', 'system')),
  created_at timestamptz not null default clock_timestamp()
);
create index history_booking_idx on public.booking_history(booking_id, created_at);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  history_id uuid not null unique references public.booking_history(id) on delete restrict,
  read_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
create index notifications_recipient_idx on public.notifications(recipient_id, created_at);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete restrict,
  entity_id uuid not null,
  entity_type text not null,
  action text not null,
  details jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
create index audit_entity_idx on public.audit_logs(entity_type, entity_id, created_at);

create function private.current_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

-- Trigger-only definer, never accepts role metadata from a signup payload.
create function private.on_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values (new.id);
  return new;
end;
$$;
create trigger create_customer_profile after insert on auth.users
for each row execute function private.on_signup();
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;

create function private.lock_booking_writes() returns void
language plpgsql set search_path = '' as $$
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'READ_COMMITTED_REQUIRED' using errcode = '25001';
  end if;
  -- All booking mutations use the same lock order. Suitable for a single restaurant.
  perform pg_advisory_xact_lock(60260930, 1);
end;
$$;

-- Invoker-only internal helper. Executable only by the migration owner.
create function private.record_booking_event(
  p_id uuid, p_actor uuid, p_from public.booking_status,
  p_to public.booking_status, p_reason text, p_source text
) returns void language plpgsql set search_path = '' as $$
declare v_event uuid; v_customer uuid;
begin
  insert into public.booking_history(booking_id, actor_id, from_status, to_status, reason, source)
  values (p_id, p_actor, p_from, p_to, p_reason, p_source) returning id into v_event;
  select customer_id into v_customer from public.bookings where id = p_id;
  if v_customer is not null then
    insert into public.notifications(recipient_id, history_id) values (v_customer, v_event);
  end if;
  insert into public.audit_logs(actor_id, entity_id, entity_type, action, details)
  values (p_actor, p_id, 'booking', p_to::text,
    jsonb_build_object('from', p_from, 'to', p_to, 'source', p_source, 'reason', p_reason));
end;
$$;

create function private.expire_pending() returns integer
language plpgsql set search_path = '' as $$
declare v_id uuid; v_count integer := 0; v_now timestamptz;
begin
  perform private.lock_booking_writes();
  v_now := clock_timestamp();
  for v_id in
    update public.bookings set status = 'cancelled', cancellation_source = 'system',
      reason = 'pending_expired', updated_at = v_now
    where status = 'pending' and expires_at <= v_now returning id
  loop
    perform private.record_booking_event(v_id, null, 'pending', 'cancelled', 'pending_expired', 'system');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create function public.create_booking(
  p_idempotency_key uuid, p_table_id uuid, p_starts_at timestamptz,
  p_guest_count integer, p_contact_name text, p_contact_phone text,
  p_contact_email text default null, p_notes text default '',
  p_source public.booking_source default 'website', p_customer_id uuid default null
) returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_role public.app_role; v_customer uuid;
  v_policy public.restaurant_settings; v_table public.tables; v_result public.bookings;
  v_now timestamptz; v_end timestamptz; v_blocked timestamptz;
  v_local timestamp; v_local_end timestamp; v_payload jsonb; v_status public.booking_status;
begin
  perform private.lock_booking_writes();
  select role into v_role from public.profiles where id = v_actor and is_active for share;
  if v_role is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_source is null or (v_role = 'customer' and p_source <> 'website')
     or (v_role in ('staff','admin') and p_source = 'website') then
    raise exception 'SOURCE_NOT_ALLOWED' using errcode = '42501';
  end if;
  v_customer := case when v_role = 'customer' then v_actor else p_customer_id end;
  if v_role = 'customer' and p_customer_id is not null and p_customer_id <> v_actor then
    raise exception 'OWNER_MISMATCH' using errcode = '42501';
  end if;
  if v_customer is not null then
    perform 1 from public.profiles where id = v_customer and role = 'customer' and is_active for share;
    if not found then raise exception 'INVALID_CUSTOMER'; end if;
  end if;
  if p_idempotency_key is null or p_table_id is null or p_starts_at is null
     or not isfinite(p_starts_at) or p_guest_count is null then raise exception 'INVALID_INPUT'; end if;
  v_payload := jsonb_build_object('table', p_table_id, 'start', extract(epoch from p_starts_at),
    'guests', p_guest_count, 'name', p_contact_name, 'phone', p_contact_phone,
    'email', p_contact_email, 'notes', p_notes, 'source', p_source, 'customer', v_customer);
  perform private.expire_pending();
  select * into v_result from public.bookings
    where created_by = v_actor and idempotency_key = p_idempotency_key;
  if found then
    if v_result.request_payload <> v_payload then raise exception 'IDEMPOTENCY_PAYLOAD_MISMATCH'; end if;
    return v_result;
  end if;
  select * into strict v_policy from public.restaurant_settings where id for share;
  select t.* into v_table from public.tables t join public.areas a on a.id = t.area_id
    where t.id = p_table_id and t.is_active and a.is_active for share of t, a;
  if not found or v_table.status = 'out_of_service' then raise exception 'TABLE_UNAVAILABLE'; end if;
  if p_guest_count not between 1 and v_policy.max_guests or p_guest_count > v_table.capacity then
    raise exception 'INVALID_CAPACITY';
  end if;
  v_now := clock_timestamp();
  if p_source = 'walk_in' then
    -- Caller supplies a current arrival instant; tolerate request transit for up to one minute.
    if p_starts_at < v_now - interval '1 minute' or p_starts_at > v_now then
      raise exception 'INVALID_WALK_IN_TIME';
    end if;
    if v_table.status <> 'available' then raise exception 'TABLE_NOT_READY'; end if;
  elsif p_starts_at < v_now + make_interval(mins => v_policy.min_notice_minutes) then
    raise exception 'MIN_NOTICE';
  end if;
  if p_starts_at > v_now + make_interval(hours => v_policy.max_advance_days * 24) then raise exception 'MAX_ADVANCE'; end if;
  v_end := p_starts_at + make_interval(mins => v_policy.duration_minutes);
  v_blocked := v_end + make_interval(mins => v_policy.buffer_minutes);
  v_local := p_starts_at at time zone v_policy.timezone;
  v_local_end := v_blocked at time zone v_policy.timezone;
  if exists(select 1 from public.closure_dates where closed_on = v_local::date)
     or v_local::date <> v_local_end::date or not exists (
       select 1 from public.business_hours where weekday = extract(dow from v_local)
       and opens_at <= v_local::time and closes_at >= v_local_end::time
     ) then raise exception 'OUTSIDE_BUSINESS_HOURS'; end if;
  if v_customer is not null and p_starts_at >= v_now and (select count(*) from public.bookings
      where customer_id = v_customer and starts_at >= v_now
      and status in ('pending','confirmed','checked_in')) >= v_policy.max_active_bookings then
    raise exception 'CUSTOMER_BOOKING_LIMIT';
  end if;
  v_status := case when p_source = 'website' then 'pending'::public.booking_status else 'confirmed'::public.booking_status end;
  insert into public.bookings(customer_id, created_by, idempotency_key, request_payload, table_id,
    source, status, contact_name, contact_phone, contact_email, notes, guest_count,
    starts_at, ends_at, blocked_until, expires_at)
  values(v_customer, v_actor, p_idempotency_key, v_payload, p_table_id, p_source, v_status,
    p_contact_name, p_contact_phone, p_contact_email, p_notes, p_guest_count,
    p_starts_at, v_end, v_blocked,
    case when v_status = 'pending' then v_now + make_interval(mins => v_policy.pending_minutes) end)
  returning * into v_result;
  perform private.record_booking_event(v_result.id, v_actor, null, v_status, null,
    case when v_role = 'customer' then 'customer' else 'staff' end);
  return v_result;
end;
$$;

-- Return the cancelled record for an expired request, so expiration commits instead of rolling back.
create function public.confirm_booking(p_id uuid) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare v_result public.bookings; v_role public.app_role;
begin
  perform private.lock_booking_writes();
  select role into v_role from public.profiles where id = auth.uid() and is_active for share;
  if v_role not in ('staff','admin') or v_role is null then
    raise exception 'STAFF_REQUIRED' using errcode = '42501';
  end if;
  perform private.expire_pending();
  select * into v_result from public.bookings where id = p_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_result.status = 'cancelled' and v_result.reason = 'pending_expired' then return v_result; end if;
  if v_result.status = 'confirmed' then return v_result; end if;
  if v_result.status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
  perform 1 from public.tables t join public.areas a on a.id = t.area_id
    where t.id = v_result.table_id and t.is_active and a.is_active and t.status <> 'out_of_service'
    for share of t, a;
  if not found then
    raise exception 'TABLE_UNAVAILABLE';
  end if;
  -- A catalog row lock may have taken time; never confirm after the hold deadline.
  perform private.expire_pending();
  select * into v_result from public.bookings where id = p_id;
  if v_result.status = 'cancelled' then return v_result; end if;
  update public.bookings set status = 'confirmed', updated_at = clock_timestamp()
    where id = p_id returning * into v_result;
  perform private.record_booking_event(p_id, auth.uid(), 'pending', 'confirmed', null, 'staff');
  return v_result;
end;
$$;

-- Tight default-deny grants, including installations with Supabase default grants.
do $$ declare t text; begin
  foreach t in array array['profiles','restaurant_settings','business_hours','closure_dates','areas',
    'tables','menu_categories','menu_items','bookings','booking_history','notifications','audit_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
grant select on public.restaurant_settings, public.business_hours, public.closure_dates,
  public.areas, public.tables, public.menu_categories, public.menu_items to anon;
grant update(full_name, phone) on public.profiles to authenticated;
grant update(read_at) on public.notifications to authenticated;

create policy settings_read on public.restaurant_settings for select to anon, authenticated using (true);
create policy hours_read on public.business_hours for select to anon, authenticated using (true);
create policy closures_read on public.closure_dates for select to anon, authenticated using (true);
create policy areas_read on public.areas for select to anon, authenticated using (is_active);
create policy tables_read on public.tables for select to anon, authenticated using
  (is_active and exists(select 1 from public.areas a where a.id = area_id and a.is_active));
create policy categories_read on public.menu_categories for select to anon, authenticated using (is_active);
create policy menu_read on public.menu_items for select to anon, authenticated using
  (is_active and exists(select 1 from public.menu_categories c where c.id = category_id and c.is_active));
create policy profiles_read on public.profiles for select to authenticated using
  (private.current_role() is not null and (id = auth.uid() or private.current_role() = 'admin'));
create policy profiles_edit on public.profiles for update to authenticated
  using (id = auth.uid() and private.current_role() is not null)
  with check (id = auth.uid() and private.current_role() is not null);
create policy bookings_read on public.bookings for select to authenticated using
  (private.current_role() is not null and (customer_id = auth.uid() or private.current_role() in ('staff','admin')));
create policy history_read on public.booking_history for select to authenticated using
  (exists(select 1 from public.bookings b where b.id = booking_id));
create policy notifications_read on public.notifications for select to authenticated using
  (recipient_id = auth.uid() and private.current_role() is not null);
create policy notifications_edit on public.notifications for update to authenticated
  using (recipient_id = auth.uid() and private.current_role() is not null)
  with check (recipient_id = auth.uid() and private.current_role() is not null);
create policy audit_read on public.audit_logs for select to authenticated using (private.current_role() = 'admin');

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.current_role() to authenticated;
revoke all on function public.create_booking(uuid,uuid,timestamptz,integer,text,text,text,text,public.booking_source,uuid)
  from public, anon, authenticated;
grant execute on function public.create_booking(uuid,uuid,timestamptz,integer,text,text,text,text,public.booking_source,uuid)
  to authenticated;
revoke all on function public.confirm_booking(uuid) from public, anon, authenticated;
grant execute on function public.confirm_booking(uuid) to authenticated;

commit;
