begin;

create or replace function public.staff_update_booking(
  p_id uuid,
  p_action text,
  p_reason text default null,
  p_actual_guest_count integer default null
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_role public.app_role; v_booking public.bookings; v_from public.booking_status;
  v_table public.tables; v_policy public.restaurant_settings; v_now timestamptz;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), ''); v_guest_count integer;
begin
  perform private.lock_booking_writes();
  select role into v_role from public.profiles where id = v_actor and is_active for share;
  if v_role not in ('staff', 'admin') or v_role is null then raise exception 'STAFF_REQUIRED' using errcode = '42501'; end if;
  if p_id is null or p_action not in ('confirm', 'reject', 'cancel', 'check_in', 'no_show', 'complete') then raise exception 'INVALID_INPUT'; end if;
  perform private.expire_pending();
  select * into v_booking from public.bookings where id = p_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  select * into strict v_policy from public.restaurant_settings where id for share;
  select * into v_table from public.tables where id = v_booking.table_id for update;
  if not found then raise exception 'TABLE_UNAVAILABLE'; end if;
  v_now := clock_timestamp();
  if p_action in ('reject', 'cancel') and (v_reason is null or length(v_reason) > 500) then raise exception 'REASON_REQUIRED'; end if;
  if p_action = 'confirm' then
    if v_booking.status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
    if v_booking.expires_at is null or v_booking.expires_at <= v_now then raise exception 'PENDING_EXPIRED'; end if;
    if v_table.is_active = false or v_table.status = 'out_of_service' then raise exception 'TABLE_UNAVAILABLE'; end if;
    if exists (select 1 from public.bookings b where b.id <> v_booking.id and b.table_id = v_booking.table_id and b.status in ('pending','confirmed','checked_in') and tstzrange(b.starts_at,b.blocked_until,'[)') && tstzrange(v_booking.starts_at,v_booking.blocked_until,'[)')) then raise exception 'BOOKING_CONFLICT' using errcode = '23P01'; end if;
    update public.bookings set status = 'confirmed', updated_at = v_now where id = p_id returning * into v_booking;
    perform private.record_booking_event(p_id, v_actor, 'pending', 'confirmed', null, 'staff'); return v_booking;
  end if;
  if p_action = 'reject' then
    if v_booking.status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
    update public.bookings set status = 'rejected', reason = v_reason, updated_at = v_now where id = p_id returning * into v_booking;
    perform private.record_booking_event(p_id, v_actor, 'pending', 'rejected', v_reason, 'staff'); return v_booking;
  end if;
  if p_action = 'cancel' then
    if v_booking.status not in ('pending','confirmed') then raise exception 'INVALID_TRANSITION'; end if;
    v_from := v_booking.status;
    update public.bookings set status = 'cancelled', cancellation_source = 'staff', reason = v_reason, updated_at = v_now where id = p_id returning * into v_booking;
    perform private.record_booking_event(p_id, v_actor, v_from, 'cancelled', v_reason, 'staff'); return v_booking;
  end if;
  if p_action = 'check_in' then
    if v_booking.status <> 'confirmed' then raise exception 'INVALID_TRANSITION'; end if;
    if v_now < v_booking.starts_at - make_interval(mins => v_policy.early_checkin_minutes) then raise exception 'CHECKIN_TOO_EARLY'; end if;
    if v_now > v_booking.starts_at + make_interval(mins => v_policy.no_show_minutes) then raise exception 'CHECKIN_TOO_LATE'; end if;
    if v_table.status <> 'available' then raise exception 'TABLE_NOT_READY'; end if;
    v_guest_count := coalesce(p_actual_guest_count, v_booking.guest_count);
    if v_guest_count < 1 or v_guest_count > v_table.capacity or v_guest_count > v_policy.max_guests then raise exception 'INVALID_CAPACITY'; end if;
    update public.bookings set status = 'checked_in', guest_count = v_guest_count, actual_guest_count = v_guest_count, checked_in_at = v_now, updated_at = v_now where id = p_id returning * into v_booking;
    update public.tables set status = 'occupied' where id = v_table.id;
    perform private.record_booking_event(p_id, v_actor, 'confirmed', 'checked_in', null, 'staff'); return v_booking;
  end if;
  if p_action = 'no_show' then
    if v_booking.status <> 'confirmed' then raise exception 'INVALID_TRANSITION'; end if;
    if v_now <= v_booking.starts_at + make_interval(mins => v_policy.no_show_minutes) then raise exception 'NO_SHOW_TOO_EARLY'; end if;
    update public.bookings set status = 'no_show', reason = coalesce(v_reason, 'no_show'), updated_at = v_now where id = p_id returning * into v_booking;
    perform private.record_booking_event(p_id, v_actor, 'confirmed', 'no_show', v_booking.reason, 'staff'); return v_booking;
  end if;
  if p_action = 'complete' then
    if v_booking.status <> 'checked_in' then raise exception 'INVALID_TRANSITION'; end if;
    update public.bookings set status = 'completed', completed_at = v_now, updated_at = v_now where id = p_id returning * into v_booking;
    update public.tables set status = 'cleaning' where id = v_table.id;
    perform private.record_booking_event(p_id, v_actor, 'checked_in', 'completed', null, 'staff'); return v_booking;
  end if;
  raise exception 'INVALID_INPUT';
end;
$$;

create or replace function public.staff_move_booking(p_id uuid, p_new_table_id uuid, p_reason text) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_role public.app_role; v_booking public.bookings; v_old_table public.tables; v_new_table public.tables; v_reason text := nullif(btrim(coalesce(p_reason,'')), ''); v_now timestamptz;
begin
  perform private.lock_booking_writes();
  select role into v_role from public.profiles where id = v_actor and is_active for share;
  if v_role not in ('staff','admin') or v_role is null then raise exception 'STAFF_REQUIRED' using errcode = '42501'; end if;
  if p_id is null or p_new_table_id is null or v_reason is null or length(v_reason) > 500 then raise exception 'REASON_REQUIRED'; end if;
  perform private.expire_pending();
  select * into v_booking from public.bookings where id = p_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_booking.status <> 'confirmed' then raise exception 'MOVE_NOT_ALLOWED'; end if;
  select * into v_old_table from public.tables where id = v_booking.table_id for update;
  select * into v_new_table from public.tables where id = p_new_table_id for update;
  if not found or v_new_table.is_active = false or v_new_table.status <> 'available' then raise exception 'TABLE_UNAVAILABLE'; end if;
  if v_new_table.capacity < v_booking.guest_count then raise exception 'INVALID_CAPACITY'; end if;
  if exists (select 1 from public.bookings b where b.id <> v_booking.id and b.table_id = p_new_table_id and b.status in ('pending','confirmed','checked_in') and tstzrange(b.starts_at,b.blocked_until,'[)') && tstzrange(v_booking.starts_at,v_booking.blocked_until,'[)')) then raise exception 'BOOKING_CONFLICT' using errcode = '23P01'; end if;
  v_now := clock_timestamp();
  update public.bookings set table_id = p_new_table_id, updated_at = v_now where id = p_id returning * into v_booking;
  perform private.record_booking_event(p_id, v_actor, 'confirmed', 'confirmed', v_reason || ' · ' || v_old_table.code || ' → ' || v_new_table.code, 'staff'); return v_booking;
end;
$$;

create or replace function public.staff_mark_table_ready(p_table_id uuid) returns public.tables
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_role public.app_role; v_table public.tables;
begin
  perform private.lock_booking_writes();
  select role into v_role from public.profiles where id = v_actor and is_active for share;
  if v_role not in ('staff','admin') or v_role is null then raise exception 'STAFF_REQUIRED' using errcode = '42501'; end if;
  select * into v_table from public.tables where id = p_table_id for update;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  if v_table.status <> 'cleaning' then raise exception 'TABLE_NOT_CLEANING'; end if;
  if exists (select 1 from public.bookings where table_id = p_table_id and status = 'checked_in') then raise exception 'TABLE_STILL_IN_USE'; end if;
  update public.tables set status = 'available' where id = p_table_id returning * into v_table;
  insert into public.audit_logs(actor_id, entity_id, entity_type, action, details) values (v_actor, p_table_id, 'table', 'available', jsonb_build_object('from','cleaning','source','staff'));
  return v_table;
end;
$$;

revoke all on function public.staff_update_booking(uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.staff_update_booking(uuid,text,text,integer) to authenticated;
revoke all on function public.staff_move_booking(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.staff_move_booking(uuid,uuid,text) to authenticated;
revoke all on function public.staff_mark_table_ready(uuid) from public, anon, authenticated;
grant execute on function public.staff_mark_table_ready(uuid) to authenticated;
commit;
