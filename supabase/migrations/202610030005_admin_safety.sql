begin;

-- Additive hardening: serialize Admin with booking/Staff before profile locks.
create or replace function private.admin_expected(p_expected jsonb, p_row jsonb, p_keys text[])
returns void language plpgsql set search_path = '' as $$
declare k text;
begin
  if p_expected is null or jsonb_typeof(p_expected) <> 'object'
    or not p_expected ?& p_keys then raise exception 'ADMIN_EXPECTED_REQUIRED'; end if;
  foreach k in array p_keys loop
    if p_expected->k is distinct from p_row->k then raise exception 'ADMIN_CONFLICT'; end if;
  end loop;
end;
$$;
revoke all on function private.admin_expected(jsonb,jsonb,text[]) from public,anon,authenticated;

create or replace function private.admin_actor() returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_role public.app_role;
begin
  perform pg_catalog.pg_advisory_xact_lock(60260930, 1);
  perform pg_catalog.pg_advisory_xact_lock(60260930, 8);
  select role into v_role from public.profiles where id = v_actor and is_active for share;
  if v_role is distinct from 'admin' then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  return v_actor;
end;
$$;

create or replace function private.admin_audit(
  p_actor uuid, p_entity_id uuid, p_entity_type text, p_action text,
  p_reason text, p_before jsonb, p_after jsonb
) returns void language plpgsql set search_path = '' as $$
begin
  -- Re-saving identical values must not create another audit event.
  if (p_before - 'updated_at') = (p_after - 'updated_at') then return; end if;
  insert into public.audit_logs(actor_id, entity_id, entity_type, action, details)
  values (
    p_actor, p_entity_id, p_entity_type, p_action,
    jsonb_build_object(
      'reason', nullif(pg_catalog.btrim(coalesce(p_reason, '')), ''),
      'before', coalesce(p_before, '{}'::jsonb),
      'after', coalesce(p_after, '{}'::jsonb)
    )
  );
end;
$$;

create or replace function public.admin_update_settings(
  p_name text, p_duration_minutes integer, p_buffer_minutes integer,
  p_min_notice_minutes integer, p_max_advance_days integer,
  p_pending_minutes integer, p_cancellation_minutes integer,
  p_early_checkin_minutes integer, p_no_show_minutes integer,
  p_max_active_bookings integer, p_max_guests integer,
  p_expected jsonb, p_reason text
) returns public.restaurant_settings
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := private.admin_actor();
  v_before public.restaurant_settings; v_after public.restaurant_settings;
begin
  perform pg_catalog.pg_advisory_xact_lock(60260930, 8);
  if p_duration_minutes is null or p_buffer_minutes is null or p_min_notice_minutes is null or p_max_advance_days is null or p_pending_minutes is null or p_cancellation_minutes is null or p_early_checkin_minutes is null or p_no_show_minutes is null or p_max_active_bookings is null or p_max_guests is null then raise exception 'INVALID_POLICY'; end if;
  select * into strict v_before from public.restaurant_settings where id for update;
  perform private.admin_expected(p_expected, to_jsonb(v_before), array['name','duration_minutes','buffer_minutes','min_notice_minutes','max_advance_days','pending_minutes','cancellation_minutes','early_checkin_minutes','no_show_minutes','max_active_bookings','max_guests']);
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' or length(p_reason) > 500 then raise exception 'REASON_REQUIRED'; end if;
  if p_name is null or length(pg_catalog.btrim(p_name)) not between 1 and 120 then raise exception 'INVALID_INPUT'; end if;
  if p_duration_minutes <= 0 or p_buffer_minutes < 0 or p_min_notice_minutes < 0
     or p_max_advance_days <= 0 or p_pending_minutes <= 0
     or p_cancellation_minutes < 0 or p_early_checkin_minutes < 0
     or p_no_show_minutes < 0 or p_max_active_bookings <= 0
     or p_max_guests not between 1 and 8 or p_pending_minutes > p_min_notice_minutes then
    raise exception 'INVALID_POLICY';
  end if;
  update public.restaurant_settings set
    name = pg_catalog.btrim(p_name), duration_minutes = p_duration_minutes,
    buffer_minutes = p_buffer_minutes, min_notice_minutes = p_min_notice_minutes,
    max_advance_days = p_max_advance_days, pending_minutes = p_pending_minutes,
    cancellation_minutes = p_cancellation_minutes,
    early_checkin_minutes = p_early_checkin_minutes, no_show_minutes = p_no_show_minutes,
    max_active_bookings = p_max_active_bookings, max_guests = p_max_guests
  where id returning * into strict v_after;
  perform private.admin_audit(v_actor, gen_random_uuid(), 'restaurant_settings', 'update', p_reason, to_jsonb(v_before), to_jsonb(v_after));
  return v_after;
end;
$$;

create or replace function public.admin_upsert_business_hours(
  p_id uuid, p_weekday smallint, p_opens_at time, p_closes_at time,
  p_expected jsonb, p_reason text
) returns public.business_hours
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.admin_actor(); v_before public.business_hours; v_after public.business_hours;
begin
  perform pg_catalog.pg_advisory_xact_lock(60260930, 8);
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' or length(p_reason) > 500 then raise exception 'REASON_REQUIRED'; end if;
  if p_weekday is null or p_opens_at is null or p_closes_at is null or p_weekday not between 0 and 6 or p_opens_at >= p_closes_at then raise exception 'INVALID_HOURS'; end if;
  if p_id is not null then
    select * into v_before from public.business_hours where id = p_id for update;
    if not found then raise exception 'HOURS_NOT_FOUND'; end if;
    perform private.admin_expected(p_expected, to_jsonb(v_before), array['weekday','opens_at','closes_at']);
  elsif p_expected is not null then
    raise exception 'ADMIN_CONFLICT';
  end if;
  if exists (select 1 from public.business_hours h where h.weekday = p_weekday and h.id is distinct from p_id and h.opens_at < p_closes_at and p_opens_at < h.closes_at) then raise exception 'HOURS_OVERLAP'; end if;
  if p_id is null then
    insert into public.business_hours(weekday, opens_at, closes_at) values (p_weekday, p_opens_at, p_closes_at) returning * into v_after;
  else
    update public.business_hours set weekday = p_weekday, opens_at = p_opens_at, closes_at = p_closes_at where id = p_id returning * into v_after;
  end if;
  perform private.admin_audit(v_actor, v_after.id, 'business_hours', case when v_before.id is null then 'create' else 'update' end, p_reason, to_jsonb(v_before), to_jsonb(v_after));
  return v_after;
end;
$$;

create or replace function public.admin_delete_business_hours(p_id uuid, p_expected jsonb, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.admin_actor(); v_before public.business_hours;
begin
  perform pg_catalog.pg_advisory_xact_lock(60260930, 8);
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' or length(p_reason) > 500 then raise exception 'REASON_REQUIRED'; end if;
  select * into v_before from public.business_hours where id = p_id for update;
  if not found then return false; end if;
  perform private.admin_expected(p_expected, to_jsonb(v_before), array['weekday','opens_at','closes_at']);
  delete from public.business_hours where id = p_id;
  perform private.admin_audit(v_actor, v_before.id, 'business_hours', 'delete', p_reason, to_jsonb(v_before), '{}'::jsonb);
  return true;
end;
$$;

create or replace function public.admin_upsert_closure_date(p_closed_on date, p_closure_reason text, p_previous_reason text, p_reason text)
returns public.closure_dates language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.admin_actor(); v_before public.closure_dates; v_after public.closure_dates;
begin
  perform pg_catalog.pg_advisory_xact_lock(60260930, 8);
  if p_closed_on is null or pg_catalog.btrim(coalesce(p_closure_reason, '')) = '' or length(p_closure_reason) > 500 or pg_catalog.btrim(coalesce(p_reason, '')) = '' then raise exception 'INVALID_CLOSURE'; end if;
  select * into v_before from public.closure_dates where closed_on = p_closed_on for update;
  if v_before.closed_on is not null and p_previous_reason is distinct from v_before.reason then raise exception 'ADMIN_CONFLICT'; end if;
  update public.closure_dates set reason = pg_catalog.btrim(p_closure_reason) where closed_on = p_closed_on returning * into v_after;
  if not found then insert into public.closure_dates(closed_on, reason) values (p_closed_on, pg_catalog.btrim(p_closure_reason)) returning * into v_after; end if;
  perform private.admin_audit(v_actor, gen_random_uuid(), 'closure_dates', case when v_before.closed_on is null then 'create' else 'update' end, p_reason, to_jsonb(v_before), to_jsonb(v_after));
  return v_after;
end;
$$;

create or replace function public.admin_delete_closure_date(p_closed_on date, p_previous_reason text, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.admin_actor(); v_before public.closure_dates;
begin
  perform pg_catalog.pg_advisory_xact_lock(60260930, 8);
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' then raise exception 'REASON_REQUIRED'; end if;
  select * into v_before from public.closure_dates where closed_on = p_closed_on for update;
  if not found then return false; end if;
  if p_previous_reason is distinct from v_before.reason then raise exception 'ADMIN_CONFLICT'; end if;
  delete from public.closure_dates where closed_on = p_closed_on;
  perform private.admin_audit(v_actor, gen_random_uuid(), 'closure_dates', 'delete', p_reason, to_jsonb(v_before), '{}'::jsonb);
  return true;
end;
$$;

create or replace function public.admin_update_area(
  p_id uuid, p_name text, p_is_active boolean, p_expected jsonb, p_reason text
) returns public.areas language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.admin_actor(); v_before public.areas; v_after public.areas;
begin
  perform pg_catalog.pg_advisory_xact_lock(60260930, 8);
  if p_is_active is null then raise exception 'INVALID_INPUT'; end if;
  select * into v_before from public.areas where id = p_id for update;
  if not found then raise exception 'AREA_NOT_FOUND'; end if;
  perform private.admin_expected(p_expected, to_jsonb(v_before), array['name','is_active']);
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' or p_name is null or length(pg_catalog.btrim(p_name)) not between 1 and 120 then raise exception 'INVALID_INPUT'; end if;
  if not p_is_active and exists (select 1 from public.tables where area_id = p_id and is_active) then raise exception 'AREA_HAS_ACTIVE_TABLES'; end if;
  update public.areas set name = pg_catalog.btrim(p_name), is_active = p_is_active where id = p_id returning * into v_after;
  perform private.admin_audit(v_actor, p_id, 'area', 'update', p_reason, to_jsonb(v_before), to_jsonb(v_after));
  return v_after;
end;
$$;

create or replace function public.admin_update_table(
  p_id uuid, p_area_id uuid, p_capacity smallint, p_status public.table_status,
  p_description text, p_is_active boolean, p_expected jsonb, p_reason text
) returns public.tables language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.admin_actor(); v_before public.tables; v_after public.tables;
begin
  perform pg_catalog.pg_advisory_xact_lock(60260930, 8);
  if p_capacity is null or p_status is null or p_is_active is null or p_area_id is null then raise exception 'INVALID_INPUT'; end if;
  select * into v_before from public.tables where id = p_id for update;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  perform private.admin_expected(p_expected, to_jsonb(v_before), array['area_id','capacity','status','description','is_active']);
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' or p_capacity not between 1 and 8 or p_description is null or length(p_description) > 500 then raise exception 'INVALID_INPUT'; end if;
  if not exists (select 1 from public.areas where id = p_area_id and is_active) then raise exception 'AREA_UNAVAILABLE'; end if;
  -- Canonical floor coordinates cannot be relocated without an approved spatial mapping.
  if p_area_id is distinct from v_before.area_id then raise exception 'SPATIAL_MAPPING_REQUIRED'; end if;
  if p_status is distinct from v_before.status and (v_before.status in ('occupied','cleaning') or p_status in ('occupied','cleaning')) then raise exception 'TABLE_NOT_READY'; end if;
  if p_status = 'out_of_service' or not p_is_active or p_area_id <> v_before.area_id then
    if exists (select 1 from public.bookings where table_id = p_id and (status = 'checked_in' or (status in ('pending','confirmed') and blocked_until > clock_timestamp()))) then raise exception 'TABLE_HAS_ACTIVE_BOOKINGS'; end if;
  end if;
  if exists (select 1 from public.bookings where table_id = p_id and (status = 'checked_in' or (status in ('pending','confirmed') and blocked_until > clock_timestamp())) and greatest(guest_count, coalesce(actual_guest_count, guest_count)) > p_capacity) then raise exception 'CAPACITY_CONFLICT'; end if;
  update public.tables set area_id = p_area_id, capacity = p_capacity, status = p_status, description = pg_catalog.btrim(p_description), is_active = p_is_active where id = p_id returning * into v_after;
  perform private.admin_audit(v_actor, p_id, 'table', 'update', p_reason, to_jsonb(v_before), to_jsonb(v_after));
  return v_after;
end;
$$;

create or replace function public.admin_update_menu_category(
  p_id uuid, p_name text, p_sort_order integer, p_is_active boolean,
  p_expected jsonb, p_reason text
) returns public.menu_categories language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.admin_actor(); v_before public.menu_categories; v_after public.menu_categories;
begin
  perform pg_catalog.pg_advisory_xact_lock(60260930, 8);
  if p_sort_order is null or p_is_active is null then raise exception 'INVALID_INPUT'; end if;
  select * into v_before from public.menu_categories where id = p_id for update;
  if not found then raise exception 'CATEGORY_NOT_FOUND'; end if;
  perform private.admin_expected(p_expected, to_jsonb(v_before), array['name','sort_order','is_active']);
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' or p_name is null or length(pg_catalog.btrim(p_name)) not between 1 and 120 or p_sort_order < 0 then raise exception 'INVALID_INPUT'; end if;
  update public.menu_categories set name = pg_catalog.btrim(p_name), sort_order = p_sort_order, is_active = p_is_active where id = p_id returning * into v_after;
  perform private.admin_audit(v_actor, p_id, 'menu_category', 'update', p_reason, to_jsonb(v_before), to_jsonb(v_after));
  return v_after;
end;
$$;

create or replace function public.admin_update_menu_item(
  p_id uuid, p_category_id uuid, p_name text, p_description text, p_price numeric,
  p_image_path text, p_is_available boolean, p_is_active boolean,
  p_is_featured boolean, p_sort_order integer, p_expected jsonb, p_reason text
) returns public.menu_items language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.admin_actor(); v_before public.menu_items; v_after public.menu_items;
begin
  perform pg_catalog.pg_advisory_xact_lock(60260930, 8);
  if p_sort_order is null or p_is_active is null or p_is_available is null or p_is_featured is null then raise exception 'INVALID_INPUT'; end if;
  select * into v_before from public.menu_items where id = p_id for update;
  if not found then raise exception 'MENU_ITEM_NOT_FOUND'; end if;
  perform private.admin_expected(p_expected, to_jsonb(v_before), array['category_id','name','description','price','image_path','is_available','is_active','is_featured','sort_order']);
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' or p_name is null or length(pg_catalog.btrim(p_name)) not between 1 and 160 or p_description is null or length(p_description) > 500 or p_price is null or p_price < 0 or p_sort_order < 0 then raise exception 'INVALID_INPUT'; end if;
  if not exists (select 1 from public.menu_categories where id = p_category_id and is_active) and p_is_active then raise exception 'CATEGORY_UNAVAILABLE'; end if;
  if p_image_path is not null and p_image_path <> all (array[
    '/images/menu/dishes/goi-buoi-tom-thit.webp','/images/menu/dishes/nem-moc-vi.webp','/images/menu/dishes/cuon-tom-rau-thom.webp','/images/menu/dishes/nom-hoa-chuoi-ga-xe.webp','/images/menu/dishes/dau-hu-gion-sot-sa.webp','/images/menu/dishes/ca-lang-nuong-rieng-me.webp','/images/menu/dishes/ga-nuong-mac-khen.webp','/images/menu/dishes/bo-nuong-la-lot.webp','/images/menu/dishes/suon-non-rim-mam-toi.webp','/images/menu/dishes/vit-ap-chao-sot-me.webp','/images/menu/dishes/com-nieu-moc-vi.webp','/images/menu/dishes/com-ga-nuong-la-chanh.webp','/images/menu/dishes/bo-luc-lac-khoai-nuong.webp','/images/menu/dishes/ca-kho-to-moc-vi.webp','/images/menu/dishes/thit-kho-trung-kieu-nha.webp','/images/menu/dishes/tom-rang-thit-ba-chi.webp','/images/menu/dishes/rau-cu-theo-mua-xao-nam.webp','/images/menu/dishes/lau-rieu-cua-dong.webp','/images/menu/dishes/lau-nam-thao-moc.webp','/images/menu/dishes/lau-ga-la-e.webp','/images/menu/dishes/ca-lang-om-chuoi-dau.webp','/images/menu/dishes/che-sen-long-nhan.webp','/images/menu/dishes/kem-dua-moc-vi.webp','/images/menu/dishes/sua-chua-nep-cam.webp','/images/menu/dishes/trai-cay-theo-mua.webp','/images/menu/dishes/tra-sen-moc-vi.webp','/images/menu/dishes/tra-dao-cam-sa.webp','/images/menu/dishes/nuoc-mo-gung.webp','/images/menu/dishes/nuoc-ep-dua-bac-ha.webp','/images/menu/dishes/nuoc-ep-theo-mua.webp'
  ]::text[]) then raise exception 'IMAGE_NOT_IN_CATALOGUE'; end if;
  update public.menu_items set category_id = p_category_id, name = pg_catalog.btrim(p_name), description = pg_catalog.btrim(p_description), price = p_price, image_path = p_image_path, is_available = p_is_available, is_active = p_is_active, is_featured = p_is_featured, sort_order = p_sort_order where id = p_id returning * into v_after;
  perform private.admin_audit(v_actor, p_id, 'menu_item', 'update', p_reason, to_jsonb(v_before), to_jsonb(v_after));
  return v_after;
end;
$$;

create or replace function public.admin_update_profile(
  p_id uuid, p_role public.app_role, p_is_active boolean, p_expected jsonb, p_reason text
) returns public.profiles language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.admin_actor(); v_before public.profiles; v_after public.profiles; v_active_admins integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(60260930, 8);
  if p_role is null or p_is_active is null then raise exception 'INVALID_INPUT'; end if;
  select * into v_before from public.profiles where id = p_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  perform private.admin_expected(p_expected, to_jsonb(v_before), array['role','is_active']);
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' or length(p_reason) > 500 then raise exception 'REASON_REQUIRED'; end if;
  if p_id = v_actor and (p_role <> 'admin' or not p_is_active) then raise exception 'SELF_PROTECTION'; end if;
  if v_before.role = 'admin' and v_before.is_active and (p_role <> 'admin' or not p_is_active) then
    select count(*) into v_active_admins from public.profiles where role = 'admin' and is_active;
    if v_active_admins <= 1 then raise exception 'LAST_ADMIN'; end if;
  end if;
  update public.profiles set role = p_role, is_active = p_is_active where id = p_id returning * into v_after;
  perform private.admin_audit(
    v_actor, p_id, 'profile', 'update_access', p_reason,
    jsonb_build_object('role', v_before.role, 'is_active', v_before.is_active),
    jsonb_build_object('role', v_after.role, 'is_active', v_after.is_active)
  );
  return v_after;
end;
$$;

commit;

