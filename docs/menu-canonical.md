# Menu canonical · Mộc Vị Restaurant

Đây là catalogue mô phỏng chuẩn của đồ án. Giá được ghi bằng VND và không phải giá của cơ sở kinh doanh thật. `menu_items.code` là mã ổn định trong database; UI chỉ đọc catalogue từ `src/data/restaurant.ts` thay vì tạo danh sách menu riêng theo trang.

## Khai vị

| Mã | Món | Giá |
| --- | --- | ---: |
| MV-KV01 | Gỏi bưởi tôm thịt | 89.000đ |
| MV-KV02 | Nem Mộc Vị | 79.000đ |
| MV-KV03 | Cuốn tôm rau thơm | 69.000đ |
| MV-KV04 | Nộm hoa chuối gà xé | 79.000đ |
| MV-KV05 | Đậu hũ giòn sốt sả | 59.000đ |

## Món Việt đặc sắc

| Mã | Món | Giá |
| --- | --- | ---: |
| MV-DT01 | Cá lăng nướng riềng mẻ | 229.000đ |
| MV-DT02 | Gà nướng mắc khén | 219.000đ |
| MV-DT03 | Bò nướng lá lốt Mộc Vị | 179.000đ |
| MV-DT04 | Sườn non rim mắm tỏi | 189.000đ |
| MV-DT05 | Vịt áp chảo sốt me | 199.000đ |

## Món chính

| Mã | Món | Giá |
| --- | --- | ---: |
| MV-MC01 | Cơm niêu Mộc Vị | 139.000đ |
| MV-MC02 | Cơm gà nướng lá chanh | 129.000đ |
| MV-MC03 | Bò lúc lắc khoai nướng | 189.000đ |
| MV-MC04 | Cá kho tộ Mộc Vị | 169.000đ |
| MV-MC05 | Thịt kho trứng kiểu nhà | 149.000đ |
| MV-MC06 | Tôm rang thịt ba chỉ | 179.000đ |
| MV-MC07 | Rau củ theo mùa xào nấm | 99.000đ |

## Lẩu & dùng chung

| Mã | Món | Giá |
| --- | --- | ---: |
| MV-LA01 | Lẩu riêu cua đồng Mộc Vị | Từ 389.000đ |
| MV-LA02 | Lẩu nấm thảo mộc | Từ 329.000đ |
| MV-LA03 | Lẩu gà lá é | Từ 369.000đ |
| MV-LA04 | Cá lăng om chuối đậu | 299.000đ |

## Tráng miệng

| Mã | Món | Giá |
| --- | --- | ---: |
| MV-TM01 | Chè sen long nhãn | 59.000đ |
| MV-TM02 | Kem dừa Mộc Vị | 69.000đ |
| MV-TM03 | Sữa chua nếp cẩm | 49.000đ |
| MV-TM04 | Trái cây theo mùa | Từ 59.000đ |

## Đồ uống

| Mã | Món | Giá |
| --- | --- | ---: |
| MV-DU01 | Trà sen Mộc Vị | 49.000đ |
| MV-DU02 | Trà đào cam sả | 59.000đ |
| MV-DU03 | Nước mơ gừng | 49.000đ |
| MV-DU04 | Nước ép dứa bạc hà | 59.000đ |
| MV-DU05 | Nước ép theo mùa | 59.000đ |

## Món nổi bật

MV-KV01, MV-KV02, MV-DT01, MV-DT02, MV-DT03, MV-MC01, MV-LA01, MV-TM01 và MV-DU01.

## Combo gợi ý

Combo là nội dung recommendation theo số khách, không tạo order/cart/checkout và không gắn với mã bàn.

| Mã | Combo | Số khách | Giá |
| --- | --- | ---: | ---: |
| MV-CB01 | Combo Mộc Duyên | 2 | 499.000đ |
| MV-CB02 | Combo Mộc Gia | 4 | 899.000đ |
| MV-CB03 | Combo Mộc Tĩnh | 6 | 1.349.000đ |
| MV-CB04 | Combo Mộc Thượng | 8 | 1.799.000đ |

Chi tiết đầy đủ của từng combo nằm trong data module public, đúng theo đặc tả Phase 3A.
