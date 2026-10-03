# Hướng dẫn sử dụng Mộc Vị Restaurant

Tài liệu này mô tả cách dùng phiên bản vận hành trên Vercel:
[moc-vi-restaurant.vercel.app](https://moc-vi-restaurant.vercel.app/).

GitHub Pages tại [dangtuanminh2702206-wq.github.io/nhahang](https://dangtuanminh2702206-wq.github.io/nhahang/)
chỉ là bản demo tĩnh cho giao diện public. Pages không đăng nhập, không đọc dữ
liệu Supabase, không tìm khả dụng live và không tạo booking thật.

## Các trang public

| Trang | Mục đích |
| --- | --- |
| `/` | Giới thiệu Mộc Vị, không gian, món nổi bật và giờ phục vụ live khi bản chính kết nối database |
| `/menu` | Xem danh mục món, giá, ảnh và trạng thái món public |
| `/spaces` | Xem ba không gian/tầng |
| `/spaces/floor-1`, `/spaces/floor-2`, `/spaces/floor-3` | Xem chi tiết từng tầng và sơ đồ bàn |
| `/contact` | Xem thông tin liên hệ hiện có; không suy ra thông tin chưa được xác nhận |
| `/reservation` | Tìm bàn theo ngày, giờ và số khách; tạo booking cần Customer đăng nhập |

Sơ đồ bàn dùng vị trí canonical trong data layer. Ảnh isometric và ảnh không gian
là minh họa concept; không dùng chúng để suy ra vị trí hoặc sức chứa thực tế.

## Guest

1. Mở `/menu` hoặc `/spaces` để xem món và không gian.
2. Mở `/reservation`, chọn ngày, giờ và số khách rồi tìm bàn.
3. Xem bàn phù hợp được trả về. Kết quả chỉ là snapshot tại thời điểm truy vấn,
   chưa giữ chỗ.
4. Nếu muốn gửi yêu cầu đặt bàn, mở `/login` hoặc `/signup`.

Guest không xem được booking của người khác. API khả dụng chỉ trả mã bàn, mã tầng
và sức chứa cần thiết; không trả thông tin khách hàng.

## Customer

### Đăng ký và đăng nhập

1. Mở `/signup`, nhập email và mật khẩu từ 8 đến 128 ký tự.
2. Tài khoản đăng ký qua giao diện luôn bắt đầu với role `customer`.
3. Mở email xác nhận trong trình duyệt phù hợp với phiên đã đăng ký.
4. Mở `/login` và đăng nhập sau khi xác nhận.
5. Mở `/profile` để điền hoặc cập nhật họ tên và số điện thoại.

Không nhập thông tin tài khoản trên GitHub Pages hoặc bản local chưa cấu hình
Supabase. Chưa có chức năng tự cấp Staff/Admin hoặc đặt lại mật khẩu.

### Tạo và quản lý booking

1. Đăng nhập bằng Customer active đã xác nhận email.
2. Mở `/reservation`, chọn ngày, giờ, số khách và tìm bàn.
3. Chọn bàn phù hợp từ FloorPlan hoặc danh sách, kiểm tra thông tin rồi gửi yêu cầu.
4. Mở liên kết chi tiết sau khi tạo thành công hoặc vào `/my-bookings`.

Yêu cầu mới bắt đầu ở trạng thái chờ nhà hàng xác nhận. Một booking gắn với một
bàn; sức chứa, giờ phục vụ, ngày nghỉ, thời gian báo trước, giới hạn booking và
xung đột lịch do database kiểm tra. Retry cùng yêu cầu không tạo event trùng.

- `/my-bookings`: danh sách booking của chính Customer và thông báo nội bộ.
- `/my-bookings/<booking-id>`: thời gian, bàn, số khách, ghi chú và lịch sử của
  booking thuộc tài khoản hiện tại.
- Hủy online chỉ áp dụng cho booking của chính Customer khi còn trạng thái được
  phép và còn ít nhất 60 phút trước giờ dùng bàn. Đồng hồ database là nguồn cuối.
- Thông báo trong site là bản ghi nội bộ; chưa gửi email hoặc SMS.

Nếu gặp lỗi `409`, hãy mở lại danh sách hoặc tìm bàn lại vì snapshot đã cũ, bàn đã
được giữ bởi yêu cầu khác hoặc trạng thái booking đã thay đổi. Không gửi liên tục
khi chưa đọc lại trạng thái.

## Staff

Staff active mở `/staff`. Admin active cũng có quyền Staff operations.

### Theo dõi và tạo booking

1. Dùng bộ lọc ngày, trạng thái, tầng, mã bàn hoặc tên/số điện thoại.
2. Xem bảng bàn với trạng thái `Sẵn sàng`, `Đang phục vụ`, `Cần dọn` hoặc
   `Tạm ngưng`.
3. Tại `Tạo booking tại nhà hàng`, nhập họ tên, số điện thoại, email nếu có, số
   khách, bàn và ghi chú.
4. Chọn `Điện thoại` để nhập ngày/giờ hoặc `Khách đến trực tiếp` để dùng thời điểm
   gửi yêu cầu.
5. Bấm `Tạo booking` một lần và chờ kết quả.

Booking vận hành hợp lệ được xác nhận ngay. Phone/walk-in không tự gắn với Customer
chỉ vì có cùng số điện thoại hoặc email.

### Xử lý booking

Mở `Chi tiết` trong danh sách Staff. Các thao tác hiện theo trạng thái:

- `pending`: `Xác nhận` hoặc `Từ chối`; từ chối cần lý do.
- `pending` hoặc `confirmed`: `Hủy booking`; cần lý do.
- `confirmed`: nhập số khách thực tế rồi `Check-in`, hoặc đánh dấu `Không đến`
  với lý do.
- `checked_in`: `Hoàn tất phục vụ`; bàn chuyển sang `Cần dọn`.
- `confirmed`: chọn bàn mới, đánh dấu `Khách đã đồng ý đổi bàn`, nhập lý do rồi
  `Đổi bàn`. Hệ thống vẫn kiểm tra sức chứa và xung đột.
- Bàn `Cần dọn`: xác nhận `Đã dọn xong`; bàn trở lại `Sẵn sàng`.

Thao tác ảnh hưởng lớn yêu cầu xác nhận lần hai và được ghi vào lịch sử,
notification hoặc audit. Không tự giải phóng bàn khi khách quá giờ.

## Admin

Admin active mở `/admin`. Trang này chỉ hoạt động trên Next.js server có Supabase;
GitHub Pages chỉ hiển thị thông báo demo.

Admin có thể:

- Xem số lượng booking theo ngày, trạng thái, nguồn và tầng; khoảng ngày tối đa
  93 ngày, ngày kết thúc bao gồm cả ngày được chọn.
- Cập nhật policy đặt bàn, giờ phục vụ và ngày nghỉ.
- Cập nhật khu vực, bàn, danh mục và món theo trường được hiển thị.
- Tìm hồ sơ, phân trang 25 hồ sơ mỗi trang và cập nhật role/active khi đủ quyền.
- Xem audit gần đây.

Mỗi thay đổi cần lý do. Nếu có `409`, snapshot đã cũ: tải lại `/admin` rồi thao tác
lại. Không tự khóa tài khoản của mình hoặc Admin active cuối cùng. Đổi bàn sang
tầng khác đang bị khóa đến khi có tọa độ canonical được duyệt.

## Kịch bản demo đồ án

Chỉ dùng các tài khoản và booking QA đã được cấp quyền; không ghi email/mật khẩu
vào tài liệu hoặc repository.

1. Guest mở Home, Menu, Spaces và Reservation; tìm bàn để chứng minh projection
   công khai không lộ dữ liệu khách.
2. Customer đăng nhập, tạo booking hợp lệ, mở `/my-bookings` và xem chi tiết.
3. Staff xác nhận, check-in với số khách thực tế, hoàn tất và xác nhận dọn bàn.
4. Admin xem báo cáo/audit, thực hiện một thay đổi catalogue QA có lý do rồi khôi
   phục giá trị gốc.
5. Logout và kiểm tra lại quyền truy cập của từng vai trò.

## Lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| Liên kết xác nhận email hết hạn | Kiểm tra lại trong trình duyệt đã đăng ký; không resend lặp hoặc đổi expiry |
| Không đăng nhập được | Kiểm tra email đã xác nhận, origin và biến Supabase; không dùng Pages |
| Không tải được dữ liệu live | Kiểm tra Vercel, project Supabase và log; không coi Pages snapshot là dữ liệu live |
| Không còn bàn phù hợp | Tìm lại theo ngày/giờ/số khách; kết quả trước đó chưa giữ chỗ |
| Conflict hoặc trạng thái đã đổi | Tải lại danh sách/chi tiết trước khi gửi lại thao tác |
| Không có quyền | Xác nhận role và `is_active` trong Admin; không sửa quyền từ client |
| Booking chưa tự hết hạn | Kiểm tra scheduler và `cron.job_run_details`; RPC vẫn dọn pending ở lần chạy nghiệp vụ tiếp theo |

## Giới hạn đã chốt

Callback email được chứng minh local; không suy thành callback production. Pages là
demo tĩnh. Combo là dữ liệu public riêng, không có CRUD database. Chưa có reset
mật khẩu, email/SMS, order, thanh toán, analytics, multi-branch hoặc viewer 360.
Các thay đổi 3D/panorama nằm ngoài luồng vận hành này.
