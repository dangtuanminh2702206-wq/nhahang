# Thế giới mô phỏng Mộc Vị

Mộc Vị Restaurant là bối cảnh giả định của đồ án Kỹ thuật phần mềm ứng dụng. Tất cả địa điểm, món ăn, không gian và hình ảnh đều là dữ liệu mô phỏng; không đại diện cho nhà hàng có thật.

## Mapping dữ liệu

Schema hiện tại không có thực thể `floor` riêng. Mỗi tầng được biểu diễn bằng một dòng `areas`, sau đó mỗi `tables` thuộc đúng một `area`.

| Tầng | Area code | Tên | Định hướng | Số bàn | Tổng chỗ cấu hình |
| --- | --- | --- | --- | ---: | ---: |
| 1 | `floor-1` | Mộc Gia | Đón khách, sáng, gia đình, cửa kính, cây xanh | 8 | 32 |
| 2 | `floor-2` | Mộc Tĩnh | Yên tĩnh, khoảng cách rộng, nhóm bạn và công ty | 8 | 34 |
| 3 | `floor-3` | Mộc Thượng | Rooftop, ban công, thoáng, một khu VIP nhỏ | 6 | 26 |

Tổng cộng có **22 bàn**, sức chứa từng bàn từ 2 đến 8 người. `areas` là mô hình tầng hiện hành; không tạo migration chỉ nhằm phục vụ hiển thị UI.

Đối chiếu ngày 30/09/2026: mã bàn, mapping tầng và capacity trong
`src/data/restaurant.ts` khớp `supabase/seed.sql`. Tổng **92 chỗ cấu hình**;
đây không phải 92 chỗ đang trống hoặc có thể đặt ngay. Supabase development đã
sao lưu/thay seed có xác nhận và đọc lại khớp các mã/tầng/capacity trên; smoke đạt.

Một booking chỉ gắn một bàn, số khách từ 1 đến `min(capacity, max_guests)`;
`max_guests` mặc định 8. Không ghép/tách bàn. Khả dụng thực tế còn phụ thuộc
is_active của tầng/bàn, trạng thái bàn, giờ mở cửa, ngày nghỉ, lịch booking và
chính sách thời gian trong [database.md](database.md).

## Bàn theo tầng

Spatial spec được người dùng duyệt ngày 01/10/2026 là source of truth cho Public UI.
Tọa độ dưới đây là tâm bàn (left %, top %), origin ở góc trên-trái canvas.
`src/data/restaurant.ts` dùng chung cho FloorPlan/danh sách/select reservation;
nearbyLandmarks chỉ là metadata concept để chuẩn bị 360, không triển khai viewer.
Không thay migration/seed/cloud; mã/tầng/capacity vẫn giữ nguyên. Isometric AI
không thay thế spec này hoặc là bằng chứng đồng bộ vị trí bàn.

### Tầng 1 · Mộc Gia

| Mã bàn | Chỗ | Vị trí | Ghi chú | Tâm (x,y) % |
| --- | ---: | --- | --- | --- |
| T1-B01 | 2 | Gần cửa kính | Phù hợp cặp đôi | 18,22 |
| T1-B02 | 2 | Khu trung tâm gần kính | | 43,27 |
| T1-B03 | 4 | Khu gia đình | | 69,22 |
| T1-B04 | 4 | Gần cây xanh | | 21,50 |
| T1-B05 | 4 | Giữa sảnh | | 49,47 |
| T1-B06 | 4 | Gần cầu thang | Không gian thoáng | 75,48 |
| T1-B07 | 6 | Khu gia đình lớn | | 30,73 |
| T1-B08 | 6 | Gần cầu thang | | 71,73 |

Sơ đồ: cửa kính phía bắc, cầu thang lên T2 phía đông, lối vào phía nam, quầy đón
khách phía tây-nam, cụm cây/vách xanh phía tây-trung tâm. B05 làm anchor; B02 bắc,
B04 tây, B06 đông, B07 tây-nam, B08 đông-nam của B05. Tổng 8 bàn/32 chỗ.

### Tầng 2 · Mộc Tĩnh

| Mã bàn | Chỗ | Vị trí | Tâm (x,y) % |
| --- | ---: | --- | --- |
| T2-B01 | 2 | Góc yên tĩnh | 20,75 |
| T2-B02 | 2 | Gần cửa kính | 36,22 |
| T2-B03 | 4 | Khu nhóm bạn | 72,23 |
| T2-B04 | 4 | Khu nhóm bạn | 23,48 |
| T2-B05 | 4 | Giữa tầng | 49,47 |
| T2-B06 | 4 | Bán riêng tư · Gần lõi thang | 74,48 |
| T2-B07 | 6 | Khu họp mặt nhỏ | 40,73 |
| T2-B08 | 8 | Khu nhóm lớn / công ty | 69,75 |

Landmarks: cửa kính bắc, Góc tĩnh tây-nam, lõi cầu thang T1 ↕ T3 đông,
vách/khu bán riêng tư đông-trung tâm. B05 anchor; B01 ở phía Góc tĩnh, không sát
cửa kính. Tổng 8 bàn/34 chỗ.

### Tầng 3 · Mộc Thượng

| Mã bàn | Chỗ | Vị trí | Ghi chú | Tâm (x,y) % |
| --- | ---: | --- | --- | --- |
| T3-B01 | 2 | Ban công | Phù hợp cặp đôi | 18,22 |
| T3-B02 | 2 | Khu rooftop | | 47,22 |
| T3-B03 | 4 | View thoáng | | 76,23 |
| T3-B04 | 4 | Khu ngoài trời | Gần vườn | 27,53 |
| T3-B05 | 6 | Khu rooftop | | 58,52 |
| T3-B06 | 8 | Khu VIP | Riêng tư nhất | 78,72 |

Landmarks: ban công bắc, vườn rooftop tây-nam, khu VIP đông, lõi cầu thang
đông-nam. B05 anchor; B06 giáp khu VIP. Tổng 6 bàn/26 chỗ.

## Quy ước trạng thái bàn cho FloorPlan

`neutral`, `available`, `unavailable`, `selected`, `occupied`, `cleaning`, `out-of-service` là bộ trạng thái UI dùng chung cho Public, Booking và Staff về sau. Public ở Phase 3A chỉ hiển thị `neutral`; trạng thái thực tế không được suy ra từ lịch booking ở trình duyệt.
