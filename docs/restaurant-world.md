# Thế giới mô phỏng Mộc Vị

Mộc Vị Restaurant là bối cảnh giả định của đồ án Kỹ thuật phần mềm ứng dụng. Tất cả địa điểm, món ăn, không gian và hình ảnh đều là dữ liệu mô phỏng; không đại diện cho nhà hàng có thật.

## Mapping dữ liệu

Schema hiện tại không có thực thể `floor` riêng. Mỗi tầng được biểu diễn bằng một dòng `areas`, sau đó mỗi `tables` thuộc đúng một `area`.

| Tầng | Area code | Tên | Định hướng | Số bàn |
| --- | --- | --- | --- | --- |
| 1 | `floor-1` | Mộc Gia | Đón khách, sáng, gia đình, cửa kính, cây xanh | 8 |
| 2 | `floor-2` | Mộc Tĩnh | Yên tĩnh, khoảng cách rộng, nhóm bạn và công ty | 8 |
| 3 | `floor-3` | Mộc Thượng | Rooftop, ban công, thoáng, một khu VIP nhỏ | 6 |

Tổng cộng có **22 bàn**, sức chứa từng bàn từ 2 đến 8 người. `areas` là mô hình tầng hiện hành; không tạo migration chỉ nhằm phục vụ hiển thị UI.

## Bàn theo tầng

### Tầng 1 · Mộc Gia

| Mã bàn | Chỗ | Vị trí | Ghi chú |
| --- | ---: | --- | --- |
| T1-B01 | 2 | Gần cửa kính | Phù hợp cặp đôi |
| T1-B02 | 2 | Gần lễ tân | |
| T1-B03 | 4 | Khu gia đình | |
| T1-B04 | 4 | Gần cây xanh | |
| T1-B05 | 4 | Giữa sảnh | |
| T1-B06 | 4 | Gần cửa sổ | View thoáng |
| T1-B07 | 6 | Khu gia đình lớn | |
| T1-B08 | 6 | Gần cầu thang | |

Sơ đồ: lối vào phía dưới, quầy đón khách gần lối vào, cửa kính phía trên, cầu thang bên phải.

### Tầng 2 · Mộc Tĩnh

| Mã bàn | Chỗ | Vị trí |
| --- | ---: | --- |
| T2-B01 | 2 | Góc yên tĩnh |
| T2-B02 | 2 | Gần cửa sổ |
| T2-B03 | 4 | Khu nhóm bạn |
| T2-B04 | 4 | Khu nhóm bạn |
| T2-B05 | 4 | Giữa tầng |
| T2-B06 | 4 | Gần cửa kính |
| T2-B07 | 6 | Khu họp mặt nhỏ |
| T2-B08 | 8 | Khu nhóm lớn / công ty |

### Tầng 3 · Mộc Thượng

| Mã bàn | Chỗ | Vị trí | Ghi chú |
| --- | ---: | --- | --- |
| T3-B01 | 2 | Ban công | Phù hợp cặp đôi |
| T3-B02 | 2 | Khu rooftop | |
| T3-B03 | 4 | View thoáng | |
| T3-B04 | 4 | Khu ngoài trời | |
| T3-B05 | 6 | Khu rooftop | |
| T3-B06 | 8 | Khu VIP | Riêng tư nhất |

## Quy ước trạng thái bàn cho FloorPlan

`neutral`, `available`, `unavailable`, `selected`, `occupied`, `cleaning`, `out-of-service` là bộ trạng thái UI dùng chung cho Public, Booking và Staff về sau. Public ở Phase 3A chỉ hiển thị `neutral`; trạng thái thực tế không được suy ra từ lịch booking ở trình duyệt.
