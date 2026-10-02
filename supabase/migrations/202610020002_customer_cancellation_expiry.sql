begin;

-- A pure predicate allows exact SQL boundary tests without replacing the clock.
create function private.cancellation_window_open(p_start timestamptz, p_now timestamptz, p_minutes integer)
returns boolean language sql immutable set search_path = '' as $$
  select p_start - p_now >= make_interval(mins => p_minutes)
$$;
revoke all on function private.cancellation_window_open(timestamptz,timestamptz,integer) from public, anon, authenticated;

create or replace function public.cancel_booking(p_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_role public.app_role;
  v_policy public.restaurant_settings;
  v_result public.bookings;
  v_from public.booking_status;
  v_now timestamptz;
begin
  perform private.lock_booking_writes();
  select role into v_role from public.profiles where id = v_actor and is_active for share;
  if v_role is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if v_role <> 'customer' then raise exception 'CUSTOMER_REQUIRED' using errcode = '42501'; end if;
  if p_id is null then raise exception 'INVALID_INPUT'; end if;
  select * into v_result from public.bookings where id = p_id and customer_id = v_actor for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_result.status = 'cancelled' then return v_result; end if;
  if v_result.status not in ('pending','confirmed') then raise exception 'INVALID_TRANSITION'; end if;
  v_from := v_result.status;
  select * into strict v_policy from public.restaurant_settings where id for share;
  v_now := clock_timestamp();

  -- Expire only the owned target, so unrelated pending records are untouched.
  -- Return the system result to commit expiration instead of rolling it back.
  if v_result.status = 'pending' and v_result.expires_at <= v_now then
    update public.bookings set status = 'cancelled', cancellation_source = 'system',
      reason = 'pending_expired', updated_at = v_now
    where id = v_result.id returning * into v_result;
    perform private.record_booking_event(v_result.id, null, v_from, 'cancelled', 'pending_expired', 'system');
    return v_result;
  end if;
  if not private.cancellation_window_open(v_result.starts_at, v_now, v_policy.cancellation_minutes) then
    raise exception 'CANCELLATION_WINDOW';
  end if;
  update public.bookings set status = 'cancelled', cancellation_source = 'customer',
    reason = 'customer_cancelled', updated_at = v_now
  where id = v_result.id returning * into v_result;
  perform private.record_booking_event(v_result.id, v_actor, v_from, 'cancelled', 'customer_cancelled', 'customer');
  return v_result;
end;
$$;
revoke all on function public.cancel_booking(uuid) from public, anon, authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
commit;
