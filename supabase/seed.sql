-- DEMO ONLY. Canonical catalogue for the fictional Mộc Vị Restaurant project.
-- Re-running keeps stable codes aligned; it does not remove rows from an existing database.
begin;

-- This project had an earlier Phase 2 demo catalogue. Replace only those known
-- demo codes; refuse the reset if booking history would make it unsafe.
do $$
begin
  if exists (select 1 from public.bookings) then
    raise exception 'DEMO_SEED_REQUIRES_EMPTY_BOOKINGS';
  end if;
end;
$$;

delete from public.menu_items
where code in (
  'S01','S02','S03','S04','S05','S06',
  'M01','M02','M03','M04','M05','M06',
  'D01','D02','D03','D04','D05','D06',
  'B01','B02','B03','B04','B05','B06'
);
delete from public.tables where code like 'DEMO-%';
delete from public.areas where code in ('main', 'window', 'private');

insert into public.areas(code, name, is_active) values
  ('floor-1', 'Tầng 1 · Mộc Gia', true),
  ('floor-2', 'Tầng 2 · Mộc Tĩnh', true),
  ('floor-3', 'Tầng 3 · Mộc Thượng', true)
on conflict (code) do update set name = excluded.name, is_active = excluded.is_active;

insert into public.tables(code, area_id, capacity, description, is_active)
select v.code, a.id, v.capacity, v.description, true
from (values
  ('T1-B01','floor-1',2,'Gần cửa kính · phù hợp cặp đôi'), ('T1-B02','floor-1',2,'Gần lễ tân'),
  ('T1-B03','floor-1',4,'Khu gia đình'), ('T1-B04','floor-1',4,'Gần cây xanh'),
  ('T1-B05','floor-1',4,'Giữa sảnh'), ('T1-B06','floor-1',4,'Gần cửa sổ · view thoáng'),
  ('T1-B07','floor-1',6,'Khu gia đình lớn'), ('T1-B08','floor-1',6,'Gần cầu thang'),
  ('T2-B01','floor-2',2,'Góc yên tĩnh'), ('T2-B02','floor-2',2,'Gần cửa sổ'),
  ('T2-B03','floor-2',4,'Khu nhóm bạn'), ('T2-B04','floor-2',4,'Khu nhóm bạn'),
  ('T2-B05','floor-2',4,'Giữa tầng'), ('T2-B06','floor-2',4,'Gần cửa kính'),
  ('T2-B07','floor-2',6,'Khu họp mặt nhỏ'), ('T2-B08','floor-2',8,'Khu nhóm lớn / công ty'),
  ('T3-B01','floor-3',2,'Ban công · phù hợp cặp đôi'), ('T3-B02','floor-3',2,'Khu rooftop'),
  ('T3-B03','floor-3',4,'View thoáng'), ('T3-B04','floor-3',4,'Khu ngoài trời'),
  ('T3-B05','floor-3',6,'Khu rooftop'), ('T3-B06','floor-3',8,'Khu VIP · riêng tư nhất')
) as v(code, area_code, capacity, description)
join public.areas a on a.code = v.area_code
on conflict (code) do update set area_id = excluded.area_id, capacity = excluded.capacity,
  description = excluded.description, is_active = excluded.is_active;

insert into public.business_hours(weekday, opens_at, closes_at)
select n, '10:00'::time, '22:00'::time from generate_series(0,6) n
on conflict (weekday, opens_at) do nothing;

insert into public.menu_categories(code, name, sort_order, is_active) values
  ('starters', 'Khai vị', 1, true), ('specialties', 'Món Việt đặc sắc', 2, true),
  ('mains', 'Món chính', 3, true), ('hotpots', 'Lẩu & dùng chung', 4, true),
  ('desserts', 'Tráng miệng', 5, true), ('drinks', 'Đồ uống', 6, true)
on conflict (code) do update set name = excluded.name, sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.menu_items(code, category_id, name, description, price, is_available, is_active, is_featured, sort_order)
select v.code, c.id, v.name, v.description, v.price, true, true, v.featured, v.position
from (values
  ('MV-KV01','starters','Gỏi bưởi tôm thịt','Gỏi bưởi với tôm và thịt.',89000,true,1), ('MV-KV02','starters','Nem Mộc Vị','Món nem trong menu mô phỏng Mộc Vị.',79000,true,2), ('MV-KV03','starters','Cuốn tôm rau thơm','Cuốn tôm cùng rau thơm.',69000,false,3), ('MV-KV04','starters','Nộm hoa chuối gà xé','Nộm hoa chuối cùng gà xé.',79000,false,4), ('MV-KV05','starters','Đậu hũ giòn sốt sả','Đậu hũ giòn với sốt sả.',59000,false,5),
  ('MV-DT01','specialties','Cá lăng nướng riềng mẻ','Cá lăng nướng với riềng mẻ.',229000,true,1), ('MV-DT02','specialties','Gà nướng mắc khén','Gà nướng cùng mắc khén.',219000,true,2), ('MV-DT03','specialties','Bò nướng lá lốt Mộc Vị','Bò nướng lá lốt theo menu Mộc Vị.',179000,true,3), ('MV-DT04','specialties','Sườn non rim mắm tỏi','Sườn non rim với mắm tỏi.',189000,false,4), ('MV-DT05','specialties','Vịt áp chảo sốt me','Vịt áp chảo cùng sốt me.',199000,false,5),
  ('MV-MC01','mains','Cơm niêu Mộc Vị','Cơm niêu trong menu mô phỏng Mộc Vị.',139000,true,1), ('MV-MC02','mains','Cơm gà nướng lá chanh','Cơm gà nướng cùng lá chanh.',129000,false,2), ('MV-MC03','mains','Bò lúc lắc khoai nướng','Bò lúc lắc ăn cùng khoai nướng.',189000,false,3), ('MV-MC04','mains','Cá kho tộ Mộc Vị','Cá kho tộ theo menu Mộc Vị.',169000,false,4), ('MV-MC05','mains','Thịt kho trứng kiểu nhà','Thịt kho trứng kiểu nhà.',149000,false,5), ('MV-MC06','mains','Tôm rang thịt ba chỉ','Tôm rang cùng thịt ba chỉ.',179000,false,6), ('MV-MC07','mains','Rau củ theo mùa xào nấm','Rau củ theo mùa xào nấm.',99000,false,7),
  ('MV-LA01','hotpots','Lẩu riêu cua đồng Mộc Vị','Lẩu riêu cua đồng theo menu Mộc Vị.',389000,true,1), ('MV-LA02','hotpots','Lẩu nấm thảo mộc','Lẩu nấm cùng thảo mộc.',329000,false,2), ('MV-LA03','hotpots','Lẩu gà lá é','Lẩu gà với lá é.',369000,false,3), ('MV-LA04','hotpots','Cá lăng om chuối đậu','Cá lăng om chuối đậu.',299000,false,4),
  ('MV-TM01','desserts','Chè sen long nhãn','Chè sen cùng long nhãn.',59000,true,1), ('MV-TM02','desserts','Kem dừa Mộc Vị','Kem dừa trong menu Mộc Vị.',69000,false,2), ('MV-TM03','desserts','Sữa chua nếp cẩm','Sữa chua cùng nếp cẩm.',49000,false,3), ('MV-TM04','desserts','Trái cây theo mùa','Trái cây theo mùa.',59000,false,4),
  ('MV-DU01','drinks','Trà sen Mộc Vị','Trà sen trong menu Mộc Vị.',49000,true,1), ('MV-DU02','drinks','Trà đào cam sả','Trà đào với cam và sả.',59000,false,2), ('MV-DU03','drinks','Nước mơ gừng','Nước mơ cùng gừng.',49000,false,3), ('MV-DU04','drinks','Nước ép dứa bạc hà','Nước ép dứa cùng bạc hà.',59000,false,4), ('MV-DU05','drinks','Nước ép theo mùa','Nước ép theo mùa.',59000,false,5)
) as v(code, category_code, name, description, price, featured, position)
join public.menu_categories c on c.code = v.category_code
on conflict (code) do update set category_id = excluded.category_id, name = excluded.name,
  description = excluded.description, price = excluded.price, is_available = excluded.is_available,
  is_active = excluded.is_active, is_featured = excluded.is_featured, sort_order = excluded.sort_order;

commit;
