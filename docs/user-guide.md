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

Trang tầng có sơ đồ ảnh với hotspot để chọn bàn. Mã bàn, sức chứa và trạng thái
không lấy từ nội dung ảnh mà từ catalogue đang dùng; các ảnh isometric được giữ
trong repo nhưng hiện không hiển thị trên trang tầng.

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
Supabase. Tài khoản đăng ký không tự được cấp Staff/Admin.

### Đổi mật khẩu khi đang đăng nhập

Mở **Hồ sơ**, chọn **Đổi mật khẩu** dưới phần chỉnh sửa hồ sơ. Nhập mật khẩu
mới hai lần rồi lưu; sau khi thành công, đăng nhập lại bằng mật khẩu mới.
Chức năng này dùng cho chính tài khoản active đang đăng nhập, bao gồm Customer,
Staff và Admin, không đổi quyền hoặc mật khẩu của người khác.

### Quên mật khẩu

Tại trang đăng nhập, chọn `Quên mật khẩu?`, nhập email và yêu cầu liên kết.
Mở thư trong cùng trình duyệt đã gửi yêu cầu. Liên kết hợp lệ đưa tới trang đặt
mật khẩu mới; trang hiển thị email tài khoản đang được đổi. Nếu tài khoản đang
đăng nhập active, trang này cũng cho đổi chính mật khẩu của tài khoản đó.

Nhập mật khẩu mới hai lần. Sau khi cập nhật và đăng xuất thành công, đăng nhập
lại bằng mật khẩu mới. Nếu cập nhật thành công nhưng đăng xuất gặp lỗi, trang
báo rõ để bạn không hiểu nhầm mật khẩu vẫn như cũ. Liên kết hết hạn dẫn về trang
yêu cầu khôi phục, không chuyển tới địa chỉ do trình duyệt cung cấp.

Provider áp dụng giới hạn gửi thư; không gửi liên tục. Phiên JWT đã cấp có thể
còn hiệu lực đến expiry riêng dù refresh tokens bị thu hồi. Email thật và callback
production phải được kiểm chứng riêng; test local không thay thế việc này.

### Tạo và quản lý booking

1. Đăng nhập bằng Customer active đã xác nhận email.
2. Mở `/reservation`, chọn ngày, giờ, số khách rồi bấm **Kiểm tra bàn**.
3. Chọn bàn khả dụng trên sơ đồ ảnh hoặc danh sách. Đường dẫn từ trang tầng có
   thể mở form với tầng/bàn đã chọn sẵn; hotspot và danh sách luôn đồng bộ.
4. Gửi yêu cầu và mở liên kết chi tiết sau khi tạo thành công hoặc vào `/my-bookings`.

Yêu cầu mới bắt đầu ở trạng thái chờ nhà hàng xác nhận. Một booking gắn với một
bàn; sức chứa, giờ phục vụ, ngày nghỉ, thời gian báo trước, giới hạn booking và
xung đột lịch do database kiểm tra. Retry cùng yêu cầu không tạo event trùng.

- `/my-bookings`: danh sách booking của chính Customer và thông báo nội bộ.
- `/my-bookings/<booking-id>`: thời gian, bàn, số khách, ghi chú và lịch sử của
  booking thuộc tài khoản hiện tại.
- Hủy online chỉ áp dụng cho booking của chính Customer khi còn trạng thái được
  phép và còn ít nhất 60 phút trước giờ dùng bàn. Đồng hồ database là nguồn cuối.
- Thông báo trong site là bản ghi nội bộ; chưa gửi email hoặc SMS.

### Đặt món theo booking

Sau khi booking ở trạng thái `Đã xác nhận` hoặc `Đã check-in`, Customer có thể
chọn món lẻ và combo trong chi tiết booking rồi gửi một đơn món. Server tự kiểm tra
catalogue đang phục vụ, số lượng nguyên dương và tính tổng dự kiến; không tin tổng
do trình duyệt gửi. Customer chỉ sửa hoặc hủy khi đơn còn `Chờ xác nhận`.

Staff/Admin xử lý đơn trong chi tiết booking theo thứ tự `Chờ xác nhận → Đã xác
nhận → Đang chuẩn bị → Đã phục vụ`, hoặc hủy với lý do. Khi đơn đã được tiếp nhận,
Customer cần liên hệ Staff nếu muốn thay đổi. **Thanh toán trực tiếp tại quầy nhà
hàng**; module không có thanh toán online, đặt cọc, hoàn tiền, tồn kho hoặc
email/SMS giao dịch.

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
- Thêm/sửa/ẩn combo tại `/admin/combos`; giá/thành phần được kiểm tra ở server.
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
3. Staff xác nhận booking. Customer tải lại chi tiết, chọn một món và một combo,
   gửi đơn rồi sửa số lượng khi còn chờ xác nhận.
4. Staff xác nhận đơn, chuyển sang đang chuẩn bị và đã phục vụ. Customer xem
   trạng thái/lịch sử, tổng dự kiến và dòng thanh toán trực tiếp tại quầy.
5. Khi tới khung check-in hợp lệ, Staff check-in với số khách thực tế, hoàn tất
   booking rồi xác nhận dọn bàn. Không thay policy hoặc thời gian để demo.
6. Admin xem báo cáo/audit, thực hiện một thay đổi catalogue QA có lý do rồi khôi
   phục giá trị gốc.
7. Logout và kiểm tra lại quyền truy cập của từng vai trò. Xem kịch bản chuẩn bị,
   expected result và cleanup tại [academic-handover.md](academic-handover.md).

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

Pages là demo tĩnh. Combo live và đặt món đã bật trên production; một booking
có tối đa một đơn, bắt đầu sau xác nhận hoặc check-in. Recovery email production,
đặt mật khẩu mới và login lại được operator xác nhận ngày 04/10/2026. Điều này
không chứng nhận mọi loại callback email hoặc refresh-token trace độc lập.
Không có email/SMS giao dịch, thanh toán online, kho, nhiều chi nhánh hoặc báo cáo
tài chính chuyên sâu. 3D/360 là nâng cao tùy chọn. Contact chưa có thông tin cơ sở
thật được xác nhận. Giới hạn và bằng chứng lịch sử xem database-testing.md;
hướng dẫn này mô tả hành vi hiện hành.
