begin;
-- Single-record purge; audit and retry receipts are never erased.
create function public.admin_delete_booking(p_id uuid, p_expected_updated_at timestamptz, p_confirmation text, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_booking public.bookings; v_order public.orders;
begin
  perform private.lock_booking_writes();
  v_actor := private.admin_actor();
  if length(btrim(coalesce(p_reason, ''))) not between 1 and 500 then raise exception 'REASON_REQUIRED'; end if;
  if p_confirmation is distinct from p_id::text then raise exception 'DELETE_CONFIRMATION_REQUIRED'; end if;
  select * into v_booking from public.bookings where id = p_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if p_expected_updated_at is null or v_booking.updated_at is distinct from p_expected_updated_at then raise exception 'ADMIN_CONFLICT'; end if;
  if v_booking.status not in ('completed', 'cancelled', 'rejected', 'no_show') or v_booking.ends_at >= clock_timestamp() then raise exception 'BOOKING_NOT_DELETABLE'; end if;
  select * into v_order from public.orders where booking_id = p_id for update;
  if found and v_order.status not in ('served', 'cancelled') then raise exception 'ORDER_NOT_FINISHED'; end if;
  delete from public.order_notifications where history_id in (select id from public.order_history where order_id = v_order.id);
  delete from public.order_history where order_id = v_order.id;
  delete from public.order_items where order_id = v_order.id;
  delete from public.orders where id = v_order.id;
  delete from public.notifications where history_id in (select id from public.booking_history where booking_id = p_id);
  delete from public.booking_history where booking_id = p_id;
  delete from public.bookings where id = p_id;
  perform private.admin_audit(v_actor, p_id, 'booking', 'delete', btrim(p_reason), jsonb_build_object('status', v_booking.status, 'orderDeleted', v_order.id is not null), '{}'::jsonb);
  return jsonb_build_object('deleted', true);
end;
$$;
revoke all on function public.admin_delete_booking(uuid, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.admin_delete_booking(uuid, timestamptz, text, text) to authenticated;
commit;
