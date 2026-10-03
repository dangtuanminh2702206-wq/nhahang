begin;

-- Additive catalogue. Unknown recipe quantities stay NULL, never inferred.
create table public.menu_combos (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^MV-CB[0-9]{2,4}$'),
  name text not null check (length(btrim(name)) between 1 and 160),
  description text not null check (length(description) <= 500),
  guest_count integer not null check (guest_count between 1 and 100),
  price bigint not null check (price between 0 and 1000000000),
  components jsonb not null,
  image_path text,
  is_active boolean not null default true,
  is_available boolean not null default true,
  sort_order integer not null default 0 check (sort_order between 0 and 100000),
  version integer not null default 1 check (version > 0)
);
alter table public.menu_combos enable row level security;
revoke all on public.menu_combos from public, anon, authenticated;
grant select on public.menu_combos to anon, authenticated;
create policy combo_guest_read on public.menu_combos for select to anon using (is_active);
create policy combo_authenticated_read on public.menu_combos for select to authenticated
using (is_active or private.current_role() = 'admin');

create function private.validate_combo(p_value jsonb) returns void
language plpgsql set search_path = '' as $$
declare v_item jsonb; v_code text;
begin
  if p_value is null or jsonb_typeof(p_value) <> 'array' then raise exception 'INVALID_COMPONENTS'; end if;
  if jsonb_array_length(p_value) not between 1 and 40 then raise exception 'INVALID_COMPONENTS'; end if;
  for v_item in select value from jsonb_array_elements(p_value) loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'INVALID_COMPONENTS'; end if;
    if not (v_item ?& array['label','quantity','menuCode']) or
       exists(select 1 from jsonb_object_keys(v_item) k where k not in ('label','quantity','menuCode')) then
      raise exception 'INVALID_COMPONENTS';
    end if;
    if jsonb_typeof(v_item->'label') <> 'string' or length(btrim(v_item->>'label')) not between 1 and 160 then raise exception 'INVALID_COMPONENTS'; end if;
    if v_item->'quantity' <> 'null'::jsonb then
      if jsonb_typeof(v_item->'quantity') <> 'number' then raise exception 'INVALID_COMPONENTS'; end if;
      if (v_item->>'quantity')::numeric not between 1 and 1000 or trunc((v_item->>'quantity')::numeric) <> (v_item->>'quantity')::numeric then raise exception 'INVALID_COMPONENTS'; end if;
    end if;
    if v_item->'menuCode' <> 'null'::jsonb then
      if jsonb_typeof(v_item->'menuCode') <> 'string' then raise exception 'INVALID_COMPONENTS'; end if;
      v_code := v_item->>'menuCode';
      if not exists(select 1 from public.menu_items where code=v_code and is_active) then raise exception 'COMPONENT_NOT_ACTIVE'; end if;
    end if;
  end loop;
end;
$$;
revoke all on function private.validate_combo(jsonb) from public,anon,authenticated;

create function public.admin_save_combo(
  p_id uuid, p_code text, p_name text, p_description text, p_guest_count integer,
  p_price bigint, p_components jsonb, p_image_path text, p_is_active boolean,
  p_is_available boolean, p_sort_order integer, p_expected_version integer, p_reason text
) returns public.menu_combos
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_before public.menu_combos; v_after public.menu_combos; v_payload jsonb;
begin
  perform private.lock_booking_writes();
  v_actor := private.admin_actor();
  if p_reason is null or length(btrim(p_reason)) not between 1 and 500 then raise exception 'REASON_REQUIRED'; end if;
  if p_code is null or p_code !~ '^MV-CB[0-9]{2,4}$' or p_name is null or length(btrim(p_name)) not between 1 and 160
     or p_description is null or length(p_description)>500 or p_guest_count is null or p_guest_count not between 1 and 100
     or p_price is null or p_price not between 0 and 1000000000 or p_is_active is null or p_is_available is null
     or p_sort_order is null or p_sort_order not between 0 and 100000 then raise exception 'INVALID_INPUT'; end if;
  perform private.validate_combo(p_components);
  if p_image_path is not null and p_image_path not in (
    '/images/menu/combos/moc-duyen.webp','/images/menu/combos/moc-gia.webp',
    '/images/menu/combos/moc-tinh.webp','/images/menu/combos/moc-thuong.webp'
  ) then raise exception 'IMAGE_NOT_IN_CATALOGUE'; end if;
  if p_id is null then
    if p_expected_version is not null then raise exception 'ADMIN_EXPECTED_REQUIRED'; end if;
    insert into public.menu_combos(code,name,description,guest_count,price,components,image_path,is_active,is_available,sort_order)
    values(p_code,btrim(p_name),p_description,p_guest_count,p_price,p_components,p_image_path,p_is_active,p_is_available,p_sort_order)
    returning * into v_after;
  else
    select * into v_before from public.menu_combos where id=p_id for update;
    if not found then raise exception 'COMBO_NOT_FOUND'; end if;
    if p_expected_version is null then raise exception 'ADMIN_EXPECTED_REQUIRED'; end if;
    if v_before.version <> p_expected_version then raise exception 'ADMIN_CONFLICT'; end if;
    if v_before.code <> p_code then raise exception 'COMBO_CODE_IMMUTABLE'; end if;
    v_payload := jsonb_build_object('name',btrim(p_name),'description',p_description,'guest_count',p_guest_count,'price',p_price,
      'components',p_components,'image_path',p_image_path,'is_active',p_is_active,'is_available',p_is_available,'sort_order',p_sort_order);
    if to_jsonb(v_before) - array['id','code','version'] = v_payload then return v_before; end if;
    update public.menu_combos set name=btrim(p_name),description=p_description,guest_count=p_guest_count,price=p_price,
      components=p_components,image_path=p_image_path,is_active=p_is_active,is_available=p_is_available,
      sort_order=p_sort_order,version=version+1 where id=p_id returning * into v_after;
  end if;
  perform private.admin_audit(v_actor,v_after.id,'menu_combo',case when p_id is null then 'create' else 'update' end,
    p_reason,to_jsonb(v_before),to_jsonb(v_after));
  return v_after;
end;
$$;
revoke all on function public.admin_save_combo(uuid,text,text,text,integer,bigint,jsonb,text,boolean,boolean,integer,integer,text) from public,anon;
grant execute on function public.admin_save_combo(uuid,text,text,text,integer,bigint,jsonb,text,boolean,boolean,integer,integer,text) to authenticated;

-- Preserve the approved strings verbatim; quantities and menu links await confirmation.
insert into public.menu_combos(code,name,guest_count,price,description,image_path,sort_order,components)
select code,name,guests,price,description,image_path,sort_order,
  (select jsonb_agg(jsonb_build_object('label',label,'quantity',null,'menuCode',null) order by ord)
   from unnest(labels) with ordinality as x(label,ord))
from (values
 ('MV-CB01','Combo Mộc Duyên',2,499000,'Gợi ý cho một bữa ăn hai người.','/images/menu/combos/moc-duyen.webp',0,array['Gỏi bưởi tôm thịt','Bò nướng lá lốt Mộc Vị','Cơm niêu Mộc Vị','Rau củ theo mùa xào nấm','2 Chè sen long nhãn','2 Trà sen Mộc Vị']),
 ('MV-CB02','Combo Mộc Gia',4,899000,'Gợi ý cho bữa cơm gia đình bốn người.','/images/menu/combos/moc-gia.webp',1,array['Nem Mộc Vị','Nộm hoa chuối gà xé','Cá lăng nướng riềng mẻ','Sườn non rim mắm tỏi','Rau củ theo mùa xào nấm','Cơm niêu','Chè sen long nhãn','Trà sen theo bình']),
 ('MV-CB03','Combo Mộc Tĩnh',6,1349000,'Gợi ý cho nhóm sáu người gặp gỡ chậm rãi.','/images/menu/combos/moc-tinh.webp',2,array['Gỏi bưởi tôm thịt','Nem Mộc Vị','Gà nướng mắc khén','Cá lăng nướng riềng mẻ','Tôm rang thịt ba chỉ','Rau củ theo mùa xào nấm','Lẩu nấm thảo mộc','Cơm niêu','Trái cây theo mùa','Trà sen']),
 ('MV-CB04','Combo Mộc Thượng',8,1799000,'Gợi ý cho nhóm tám người cùng dùng bữa.','/images/menu/combos/moc-thuong.webp',3,array['Gỏi bưởi tôm thịt','Nem Mộc Vị','Nộm hoa chuối gà xé','Gà nướng mắc khén','Cá lăng nướng riềng mẻ','Bò nướng lá lốt Mộc Vị','Sườn non rim mắm tỏi','Rau củ theo mùa xào nấm','Lẩu riêu cua đồng Mộc Vị','Cơm niêu','Chè sen long nhãn','Trà sen'])
) as canonical(code,name,guests,price,description,image_path,sort_order,labels);

commit;
