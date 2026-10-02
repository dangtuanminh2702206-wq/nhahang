begin;
-- Private receipts make retries stable even after a booking later changes state.
create table private.staff_operation_receipts (
  actor_id uuid not null references public.profiles(id),
  request_id uuid not null,
  payload jsonb not null,
  response jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (actor_id, request_id)
);
revoke all on private.staff_operation_receipts from public, anon, authenticated;
create function public.staff_operation(
  p_request_id uuid, p_action text, p_booking_id uuid default null,
  p_table_id uuid default null, p_reason text default null,
  p_actual_guest_count integer default null, p_guest_consent boolean default false
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_role public.app_role;
  v_payload jsonb;
  v_receipt private.staff_operation_receipts;
  v_result jsonb;
begin
  perform private.lock_booking_writes();
  select role into v_role from public.profiles where id=v_actor and is_active for share;
  if v_role is null or v_role not in ('staff','admin') then raise exception 'STAFF_REQUIRED' using errcode='42501'; end if;
  if p_request_id is null or p_action is null or p_action not in ('confirm','reject','cancel','check_in','no_show','complete','move','ready') then raise exception 'INVALID_INPUT'; end if;
  if p_reason is not null and length(p_reason) > 500 then raise exception 'INVALID_INPUT'; end if;
  v_payload := jsonb_build_object('action',p_action,'booking',p_booking_id,'table',p_table_id,'reason',p_reason,'actual',p_actual_guest_count,'consent',p_guest_consent);
  select * into v_receipt from private.staff_operation_receipts where actor_id=v_actor and request_id=p_request_id;
  if found then
    if v_receipt.payload <> v_payload then raise exception 'IDEMPOTENCY_PAYLOAD_MISMATCH'; end if;
    return v_receipt.response;
  end if;
  if p_action='ready' then
    select to_jsonb(t) into v_result from public.staff_mark_table_ready(p_table_id) t;
  elsif p_action='move' then
    select to_jsonb(b) into v_result from public.staff_move_booking(p_booking_id,p_table_id,p_reason,p_guest_consent) b;
  else
    select to_jsonb(b) into v_result from public.staff_update_booking(p_booking_id,p_action,p_reason,p_actual_guest_count) b;
  end if;
  insert into private.staff_operation_receipts(actor_id,request_id,payload,response) values(v_actor,p_request_id,v_payload,v_result);
  return v_result;
end;
$$;
-- The request-key wrapper is the only client mutation entry point.
revoke all on function public.staff_update_booking(uuid,text,text,integer) from public, anon, authenticated;
revoke all on function public.staff_move_booking(uuid,uuid,text,boolean) from public, anon, authenticated;
revoke all on function public.staff_mark_table_ready(uuid) from public, anon, authenticated;
revoke all on function public.staff_operation(uuid,text,uuid,uuid,text,integer,boolean) from public, anon, authenticated;
grant execute on function public.staff_operation(uuid,text,uuid,uuid,text,integer,boolean) to authenticated;
commit;
