begin;

-- Customer-owned cancellation. The write lock and row lock make retries and
-- concurrent cancel/confirm requests resolve to one state transition.
create or replace function public.cancel_booking(p_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role public.app_role;
  v_policy public.restaurant_settings;
  v_result public.bookings;
  v_from public.booking_status;
  v_now timestamptz;
begin
  perform private.lock_booking_writes();

  select role into v_role
  from public.profiles
  where id = v_actor and is_active
  for share;

  if v_role is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if v_role <> 'customer' then
    raise exception 'CUSTOMER_REQUIRED' using errcode = '42501';
  end if;
  if p_id is null then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_result
  from public.bookings
  where id = p_id and customer_id = v_actor
  for update;

  if not found then
    -- Do not disclose whether another Customer owns this booking.
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  -- Retrying a completed cancellation is an idempotent no-op.
  if v_result.status = 'cancelled' then
    return v_result;
  end if;
  if v_result.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_TRANSITION';
  end if;
  v_from := v_result.status;

  select * into strict v_policy
  from public.restaurant_settings
  where id
  for share;

  v_now := clock_timestamp();
  -- The boundary is inclusive: exactly cancellation_minutes is allowed.
  if v_result.starts_at - v_now < make_interval(mins => v_policy.cancellation_minutes) then
    raise exception 'CANCELLATION_WINDOW';
  end if;

  update public.bookings
  set status = 'cancelled',
      cancellation_source = 'customer',
      reason = 'customer_cancelled',
      updated_at = v_now
  where id = v_result.id
  returning * into v_result;

  perform private.record_booking_event(
    v_result.id,
    v_actor,
    v_from,
    'cancelled'::public.booking_status,
    'customer_cancelled',
    'customer'
  );
  return v_result;
end;
$$;

-- A Customer may only read history belonging to their own booking. Staff/Admin
-- keep the existing operational read capability without changing their UI.
drop policy if exists history_read on public.booking_history;
create policy history_read on public.booking_history
for select to authenticated
using (
  private.current_role() is not null
  and exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and (b.customer_id = auth.uid() or private.current_role() in ('staff', 'admin'))
  )
);

revoke all on function public.cancel_booking(uuid) from public, anon, authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;

comment on function public.cancel_booking(uuid) is
  'Customer-owned cancellation for pending/confirmed bookings at or beyond the database cancellation window; records history, notification and audit atomically.';

commit;
