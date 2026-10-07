begin;

-- Keep the numeric API exact for JavaScript clients. Existing unsafe rows must
-- be reviewed, not silently rounded or rewritten by this migration.
alter table public.orders add constraint orders_safe_total
  check (total_amount <= 9007199254740991) not valid;
alter table public.order_items add constraint order_items_safe_line_total
  check (line_total <= 9007199254740991) not valid;
alter table public.orders validate constraint orders_safe_total;
alter table public.order_items validate constraint order_items_safe_line_total;

create or replace function private.replace_order_items(p_order_id uuid, p_items jsonb)
returns numeric
language plpgsql
set search_path = ''
as $$
declare
  v_item jsonb;
  v_kind text;
  v_code text;
  v_quantity integer;
  v_key text;
  v_line integer := 0;
  v_total numeric := 0;
  v_price numeric(12,0);
  v_name text;
  v_components jsonb;
  v_menu public.menu_items;
  v_combo public.menu_combos;
  v_seen text[] := array[]::text[];
  v_line_total numeric;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'INVALID_ITEMS';
  end if;
  delete from public.order_items where order_id = p_order_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
      or not (v_item ?& array['kind','code','quantity'])
      or exists (select 1 from jsonb_object_keys(v_item) as key where key not in ('kind','code','quantity'))
      or jsonb_typeof(v_item->'kind') <> 'string'
      or jsonb_typeof(v_item->'code') <> 'string'
      or jsonb_typeof(v_item->'quantity') <> 'number'
      or (v_item->>'quantity') !~ '^[0-9]+$'
    then raise exception 'INVALID_ITEM'; end if;
    v_kind := v_item->>'kind';
    v_code := btrim(v_item->>'code');
    v_quantity := (v_item->>'quantity')::integer;
    if v_kind not in ('dish', 'combo') or v_code !~ '^MV-[A-Z0-9-]{1,30}$' or v_quantity < 1 then
      raise exception 'INVALID_ITEM';
    end if;
    v_key := v_kind || ':' || v_code;
    if v_key = any(v_seen) then raise exception 'DUPLICATE_ITEM'; end if;
    v_seen := array_append(v_seen, v_key);
    if v_kind = 'dish' then
      -- Lock both records so category hiding cannot race a new/edit request.
      select m.* into v_menu from public.menu_items m
      join public.menu_categories c on c.id = m.category_id
      where m.code = v_code and m.is_active and m.is_available and c.is_active
      for share of m, c;
      if not found then raise exception 'ITEM_UNAVAILABLE'; end if;
      v_name := v_menu.name;
      v_price := v_menu.price;
      v_components := '[]'::jsonb;
    else
      select * into v_combo from public.menu_combos where code = v_code and is_active and is_available for share;
      if not found then raise exception 'ITEM_UNAVAILABLE'; end if;
      v_name := v_combo.name;
      v_price := v_combo.price;
      v_components := v_combo.components;
    end if;
    v_line := v_line + 1;
    v_line_total := v_price * v_quantity;
    v_total := v_total + v_line_total;
    if v_line_total > 9007199254740991 or v_total > 9007199254740991 then
      raise exception 'TOTAL_TOO_LARGE';
    end if;
    insert into public.order_items(order_id, line_no, item_type, item_code, item_name, unit_price, quantity, line_total, snapshot_components)
    values (p_order_id, v_line, v_kind, v_code, v_name, v_price, v_quantity, v_line_total, v_components);
  end loop;
  return v_total;
end;
$$;

-- Internal helper is called only by owner-executed RPCs, never directly by clients.
revoke all on function private.replace_order_items(uuid,jsonb) from public, anon, authenticated;

commit;
