# Menu canonical · Mộc Vị Restaurant

Đây là catalogue mô phỏng chuẩn của đồ án. Giá được ghi bằng VND và không phải giá của cơ sở kinh doanh thật. `menu_items.code` là mã ổn định trong database; UI chỉ đọc catalogue từ `src/data/restaurant.ts` thay vì tạo danh sách menu riêng theo trang.

Trên Vercel, UI ghép baseline/code/ảnh với tên/giá/trạng thái catalogue live;
combo live nằm trong menu_combos và có Admin CRUD đã nghiệm thu. Pages dùng
snapshot repo. Các đối chiếu UI/seed bên dưới là baseline demo, không ghi đè
thay đổi vận hành hợp lệ. Đơn lưu snapshot và tính tiền dự kiến tại server.

## Tổng hợp baseline

Đối chiếu ngày 30/09/2026: 30 mã món duy nhất có tên, danh mục, mô tả, giá và
featured khớp giữa `src/data/restaurant.ts` và `supabase/seed.sql`. Không dùng
số ảnh để suy ra số món. Supabase development đã sao lưu/thay seed có xác nhận;
đọc lại khớp 30 món/6 danh mục và smoke test catalogue mới đạt.

| Danh mục | Món UI / seed | Có ảnh / thiếu ảnh |
| --- | ---: | ---: |
| Khai vị | 5 / 5 | 5 / 0 |
| Món Việt đặc sắc | 5 / 5 | 5 / 0 |
| Món chính | 7 / 7 | 7 / 0 |
| Lẩu & dùng chung | 4 / 4 | 4 / 0 |
| Tráng miệng | 4 / 4 | 4 / 0 |
| Đồ uống | 5 / 5 | 5 / 0 |
| Tổng | 30 / 30 | 30 / 0 |

Tất cả 30 món có `available=true` trong data public; seed đặt `is_available`
và `is_active` true. Đây là trạng thái demo, không phải tồn kho thời gian thực.
UI vẫn hiển thị món tạm hết nếu đổi `available=false`; thiếu ảnh chỉ dùng fallback.

UI dùng tiền tố “Từ” cho MV-LA01, MV-LA02, MV-LA03 và MV-TM04. Database chỉ lưu
giá số VND, chưa có cột tương đương `fromPrice`; không tự bổ sung schema để đồng bộ
cách trình bày. 9 món nổi bật là tập con của 30 món, không cộng thêm vào tổng.

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

Combo vẫn là catalogue public theo số khách, không có cart/checkout hoặc tồn kho;
nhưng có thể được chọn như một dòng combo trong đơn món gắn với booking đã xác nhận.

| Mã | Combo | Số khách | Giá |
| --- | --- | ---: | ---: |
| MV-CB01 | Combo Mộc Duyên | 2 | 499.000đ |
| MV-CB02 | Combo Mộc Gia | 4 | 899.000đ |
| MV-CB03 | Combo Mộc Tĩnh | 6 | 1.349.000đ |
| MV-CB04 | Combo Mộc Thượng | 8 | 1.799.000đ |

Chi tiết đầy đủ của từng combo nằm trong data module public, đúng theo đặc tả Phase 3A.

4 combo là dữ liệu public riêng trong `menuCombos`, được seed vào `menu_combos` từ
migration catalogue và không cộng vào 30 `menu_items`. Bộ FINAL ngày 01/10/2026
đã tích hợp đủ 30 ảnh món và 4 ảnh combo, không thay tên/giá/category/code/khẩu phần;
xem [asset-integration-status.md](asset-integration-status.md). Thành phần combo
là snapshot mô tả; không phải định mức kho hoặc cơ chế tự trừ nguyên liệu. Khi
Customer đặt combo, server lưu snapshot thành phần hiện tại vào `order_items`.
