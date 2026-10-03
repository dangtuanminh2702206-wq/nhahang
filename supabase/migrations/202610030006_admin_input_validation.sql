begin;

-- Additional SQL input checks; keeps the already-applied safety migration immutable.
create or replace function private.admin_audit(
  p_actor uuid, p_entity_id uuid, p_entity_type text, p_action text,
  p_reason text, p_before jsonb, p_after jsonb
) returns void language plpgsql set search_path = '' as $$
begin
  -- Re-saving identical values must not create another audit event.
  if pg_catalog.btrim(coalesce(p_reason,'')) = '' or length(p_reason) > 500 then raise exception 'REASON_REQUIRED'; end if;
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

create or replace function public.admin_upsert_closure_date(p_closed_on date, p_closure_reason text, p_previous_reason text, p_reason text)
returns public.closure_dates language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.admin_actor(); v_before public.closure_dates; v_after public.closure_dates;
begin
  perform pg_catalog.pg_advisory_xact_lock(60260930, 8);
  if p_closed_on is null or pg_catalog.btrim(coalesce(p_closure_reason, '')) = '' or length(p_closure_reason) > 500 or pg_catalog.btrim(coalesce(p_reason, '')) = '' then raise exception 'INVALID_CLOSURE'; end if;
  select * into v_before from public.closure_dates where closed_on = p_closed_on for update;
  if v_before.closed_on is not null and p_previous_reason is distinct from v_before.reason then raise exception 'ADMIN_CONFLICT'; end if;
  if v_before.closed_on is null and p_previous_reason is not null then raise exception 'ADMIN_CONFLICT'; end if;
  update public.closure_dates set reason = pg_catalog.btrim(p_closure_reason) where closed_on = p_closed_on returning * into v_after;
  if not found then insert into public.closure_dates(closed_on, reason) values (p_closed_on, pg_catalog.btrim(p_closure_reason)) returning * into v_after; end if;
  perform private.admin_audit(v_actor, gen_random_uuid(), 'closure_dates', case when v_before.closed_on is null then 'create' else 'update' end, p_reason, to_jsonb(v_before), to_jsonb(v_after));
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
  if p_price::text in ('NaN','Infinity','-Infinity') then raise exception 'INVALID_INPUT'; end if;
  if not exists (select 1 from public.menu_categories where id = p_category_id and is_active) and p_is_active then raise exception 'CATEGORY_UNAVAILABLE'; end if;
  if p_image_path is not null and p_image_path <> all (array[
    '/images/menu/dishes/goi-buoi-tom-thit.webp','/images/menu/dishes/nem-moc-vi.webp','/images/menu/dishes/cuon-tom-rau-thom.webp','/images/menu/dishes/nom-hoa-chuoi-ga-xe.webp','/images/menu/dishes/dau-hu-gion-sot-sa.webp','/images/menu/dishes/ca-lang-nuong-rieng-me.webp','/images/menu/dishes/ga-nuong-mac-khen.webp','/images/menu/dishes/bo-nuong-la-lot.webp','/images/menu/dishes/suon-non-rim-mam-toi.webp','/images/menu/dishes/vit-ap-chao-sot-me.webp','/images/menu/dishes/com-nieu-moc-vi.webp','/images/menu/dishes/com-ga-nuong-la-chanh.webp','/images/menu/dishes/bo-luc-lac-khoai-nuong.webp','/images/menu/dishes/ca-kho-to-moc-vi.webp','/images/menu/dishes/thit-kho-trung-kieu-nha.webp','/images/menu/dishes/tom-rang-thit-ba-chi.webp','/images/menu/dishes/rau-cu-theo-mua-xao-nam.webp','/images/menu/dishes/lau-rieu-cua-dong.webp','/images/menu/dishes/lau-nam-thao-moc.webp','/images/menu/dishes/lau-ga-la-e.webp','/images/menu/dishes/ca-lang-om-chuoi-dau.webp','/images/menu/dishes/che-sen-long-nhan.webp','/images/menu/dishes/kem-dua-moc-vi.webp','/images/menu/dishes/sua-chua-nep-cam.webp','/images/menu/dishes/trai-cay-theo-mua.webp','/images/menu/dishes/tra-sen-moc-vi.webp','/images/menu/dishes/tra-dao-cam-sa.webp','/images/menu/dishes/nuoc-mo-gung.webp','/images/menu/dishes/nuoc-ep-dua-bac-ha.webp','/images/menu/dishes/nuoc-ep-theo-mua.webp'
  ]::text[]) then raise exception 'IMAGE_NOT_IN_CATALOGUE'; end if;
  update public.menu_items set category_id = p_category_id, name = pg_catalog.btrim(p_name), description = pg_catalog.btrim(p_description), price = p_price, image_path = p_image_path, is_available = p_is_available, is_active = p_is_active, is_featured = p_is_featured, sort_order = p_sort_order where id = p_id returning * into v_after;
  perform private.admin_audit(v_actor, p_id, 'menu_item', 'update', p_reason, to_jsonb(v_before), to_jsonb(v_after));
  return v_after;
end;
$$;

commit;

