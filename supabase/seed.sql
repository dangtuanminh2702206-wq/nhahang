-- DEMO ONLY. No accounts, passwords, personal contact data or external images.
-- Existing records are preserved; stable codes make repeated execution safe.
begin;
insert into public.areas(code, name) values
  ('main', 'Sảnh chính'), ('window', 'Gần cửa sổ'), ('private', 'Phòng riêng')
on conflict (code) do nothing;

insert into public.tables(code, area_id, capacity, description)
select 'DEMO-' || lpad(n::text, 2, '0'), a.id,
  case when n <= 4 then 2 when n <= 12 then 4 else 8 end,
  'Bàn minh họa cho đồ án'
from generate_series(1,16) n join public.areas a on a.code =
  case when n <= 8 then 'main' when n <= 12 then 'window' else 'private' end
on conflict (code) do nothing;

-- Proposed demo schedule only, not verified restaurant operating hours.
insert into public.business_hours(weekday, opens_at, closes_at)
select n, '10:00'::time, '22:00'::time from generate_series(0,6) n
on conflict (weekday, opens_at) do nothing;

insert into public.menu_categories(code, name, sort_order) values
  ('starters', 'Khai vị', 1), ('mains', 'Món chính', 2),
  ('desserts', 'Tráng miệng', 3), ('drinks', 'Đồ uống', 4)
on conflict (code) do nothing;

insert into public.menu_items(code, category_id, name, price, description, sort_order)
select v.code, c.id, v.name, v.price, 'Món và giá minh họa cho đồ án', v.position
from (values
  ('S01','starters','Gỏi cuốn',45000,1), ('S02','starters','Nem rán',55000,2),
  ('S03','starters','Nộm ngó sen',65000,3), ('S04','starters','Súp nấm',40000,4),
  ('S05','starters','Đậu hũ chiên',45000,5), ('S06','starters','Salad rau',50000,6),
  ('M01','mains','Cá kho tộ',120000,1), ('M02','mains','Gà nướng',150000,2),
  ('M03','mains','Bò xào',140000,3), ('M04','mains','Tôm rang',160000,4),
  ('M05','mains','Cơm chiên',80000,5), ('M06','mains','Nấm kho',85000,6),
  ('D01','desserts','Chè sen',35000,1), ('D02','desserts','Chè đậu',30000,2),
  ('D03','desserts','Bánh flan',30000,3), ('D04','desserts','Trái cây',45000,4),
  ('D05','desserts','Sữa chua',25000,5), ('D06','desserts','Kem dừa',40000,6),
  ('B01','drinks','Trà sen',30000,1), ('B02','drinks','Nước cam',45000,2),
  ('B03','drinks','Nước chanh',30000,3), ('B04','drinks','Cà phê',35000,4),
  ('B05','drinks','Trà gừng',30000,5), ('B06','drinks','Nước lọc',15000,6)
) v(code, category, name, price, position)
join public.menu_categories c on c.code = v.category
on conflict (code) do nothing;
commit;
