begin;

-- Read-only public projection. Never expose the bookings relation to anon.
create function public.find_available_tables(p_starts_at timestamptz, p_guest_count integer)
returns table(table_id uuid, table_code text, area_code text, capacity smallint)
language plpgsql security definer set search_path = '' as $$
declare
  v_policy public.restaurant_settings;
  v_now timestamptz := clock_timestamp();
  v_blocked timestamptz;
  v_local timestamp;
  v_local_end timestamp;
begin
  select * into strict v_policy from public.restaurant_settings where id;
  if p_starts_at is null or not isfinite(p_starts_at) or p_guest_count is null then
    raise exception 'INVALID_INPUT';
  end if;
  if p_guest_count not between 1 and v_policy.max_guests then raise exception 'INVALID_CAPACITY'; end if;
  if p_starts_at < v_now + make_interval(mins => v_policy.min_notice_minutes) then raise exception 'MIN_NOTICE'; end if;
  if p_starts_at > v_now + make_interval(hours => v_policy.max_advance_days * 24) then raise exception 'MAX_ADVANCE'; end if;
  v_blocked := p_starts_at + make_interval(mins => v_policy.duration_minutes + v_policy.buffer_minutes);
  v_local := p_starts_at at time zone v_policy.timezone;
  v_local_end := v_blocked at time zone v_policy.timezone;
  if v_local::date <> v_local_end::date
     or exists(select 1 from public.closure_dates where closed_on = v_local::date)
     or not exists(select 1 from public.business_hours
       where weekday = extract(dow from v_local)
         and opens_at <= v_local::time and closes_at >= v_local_end::time) then
    raise exception 'OUTSIDE_BUSINESS_HOURS';
  end if;
  return query select t.id, t.code, a.code, t.capacity
    from public.tables t join public.areas a on a.id = t.area_id
    where t.is_active and a.is_active and t.status <> 'out_of_service'
      and t.capacity >= p_guest_count
      and not exists(select 1 from public.bookings b where b.table_id = t.id
        and b.status in ('pending','confirmed','checked_in')
        -- create_booking expires these rows under its write lock before rechecking.
        and not (b.status = 'pending' and b.expires_at <= v_now)
        and b.reserved_period && tstzrange(p_starts_at, v_blocked, '[)'))
    order by a.code, t.code;
end;
$$;

revoke all on function public.find_available_tables(timestamptz,integer) from public;
grant execute on function public.find_available_tables(timestamptz,integer) to anon, authenticated;
comment on function public.find_available_tables(timestamptz,integer) is
  'Guest-safe availability snapshot, not a hold. Website create_booking rechecks policy and exclusions transactionally.';
commit;
