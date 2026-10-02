# Mộc Vị Restaurant

Website quản lý và đặt bàn trực tuyến cho một nhà hàng, được phát triển trong
đồ án môn Kỹ thuật phần mềm ứng dụng. Phiên bản hiện tại có nền tảng database và
giao diện public đã chốt, đủ bộ ảnh FINAL; các module nghiệp vụ sẽ được triển
khai theo từng giai đoạn.

## Phạm vi sản phẩm

Hệ thống dự kiến phục vụ bốn vai trò: Guest, Customer, Staff và Admin. Luồng
nghiệp vụ chính đi từ tìm bàn, tạo booking, xác nhận, nhận khách đến hoàn thành
lượt phục vụ. Order, hóa đơn, thanh toán, doanh thu, kho và nhiều chi nhánh không
thuộc phạm vi MVP.

## Tech stack

- Next.js App Router
- TypeScript strict
- Tailwind CSS
- ESLint với cấu hình Core Web Vitals và TypeScript
- Supabase PostgreSQL (migration Phần 2); Auth và Storage tích hợp ở giai đoạn sau
- Vercel cho triển khai

## Yêu cầu môi trường

- Node.js 20.9 trở lên
- pnpm 11.25 trở lên

## Cài đặt và chạy local

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Mở `http://localhost:3000` trong trình duyệt.

Trên macOS hoặc Linux, thay lệnh sao chép biến môi trường bằng:

```bash
cp .env.example .env.local
```

## Các lệnh kiểm tra

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm start
```

Kiểm thử database riêng: `pnpm test:db`. Cần PostgreSQL local và biến môi trường
`TEST_DATABASE_URL` trỏ tới database trống tên `mocvi_test_*`. Script không tự đọc
`.env.local`, không kết nối remote và không được chạy trên Supabase đang sử dụng.
Xem [hướng dẫn và kết quả kiểm thử](docs/database-testing.md).

## Biến môi trường

`.env.example` chỉ khai báo tên biến dự kiến. Không commit `.env.local` hoặc bất
kỳ khóa bí mật nào. Schema đã áp dụng trên Supabase development. Phần 4 có code
Supabase Auth; chỉ kết nối khi cấu hình public URL/key ở chế độ server. Resend chưa tích hợp.

## Kiến trúc

Quyết định kiến trúc và cấu trúc module dự kiến được ghi tại
[`docs/architecture.md`](docs/architecture.md).

## Bản xem thử trên GitHub Pages

Workflow `.github/workflows/pages.yml` xuất bản giao diện public từ nhánh
`codex/restaurant-booking-platform`. Repository cần bật Settings → Pages →
Source: GitHub Actions. Giao diện đã duyệt xuất bản thành công từ commit `4450a88`:
[Mở Mộc Vị Restaurant](https://dangtuanminh2702206-wq.github.io/nhahang/).

Đây chỉ là bản demo giao diện: chưa đăng nhập, đặt bàn hoặc vận hành nhà hàng.
Chế độ export được bật riêng bằng `GITHUB_PAGES=true`, dùng prefix `/nhahang`,
thư mục xuất `.next-pages`
và ảnh WebP gốc. Build thông thường/local/Vercel vẫn giữ chế độ Next.js server
và tối ưu ảnh mặc định. Không đưa biến bí mật hoặc kết nối database vào Pages.

## Tiến trình triển khai

Phần 1 đã thiết lập Next.js, TypeScript, Tailwind CSS, ESLint, metadata, trang
xác nhận tối thiểu và tài liệu nền móng.

Phần 2 bổ sung schema 12 bảng, constraints/indexes/RLS, hàm tạo và xác nhận
booking, hết hạn pending, seed demo và bộ kiểm thử tích hợp. Lint, typecheck và
build đã qua. Migration/seed đã chạy trên Supabase development và PostgreSQL
local; **18 nhóm kiểm thử database local và smoke test quyền Supabase đã đạt ở
catalogue Phần 2 (16 bàn/24 món)**. Seed trong repo đã đổi sang 22 bàn/30 món ở
Phần 3A. Bộ fixture đã cập nhật và **18 nhóm kiểm thử local đã đạt với seed mới**;
smoke SQL mới PASS local và Supabase development. Catalogue cloud đã được sao lưu
và thay seed có xác nhận, khớp 3 tầng/22 bàn/92 chỗ/6 danh mục/30 món.
Kiểm thử SET LOCAL ROLE không thay thế Auth/JWT thật; xem giới hạn kiểm chứng.
Chưa triển khai authentication flow, API ứng dụng, booking thật hoặc vận hành
hoặc scheduler. Kiểm thử Auth/JWT qua API sẽ thực hiện khi tích hợp authentication.

- [ERD, data dictionary, policy, quyền và migration/seed](docs/database.md)
- [Kiểm thử database và giới hạn kiểm chứng](docs/database-testing.md)

Phần 3A có Home, Spaces, ba trang tầng, FloorPlan tương tác và Menu public.
Phần 3 đã tích hợp bộ `moc-vi-ai-assets-FINAL.zip`: 16 ảnh nhà hàng, 30 ảnh món
và 4 combo (50/50), giữ nguyên bytes/path. FloorPlan dùng spatial spec mới trong
data chung: 22 bàn/92 chỗ, không suy vị trí từ isometric. Xem
[trạng thái tích hợp và kết quả nghiệm thu](docs/asset-integration-status.md).
Build/deploy lại để cập nhật trang tĩnh; task local này chưa commit/push/deploy.

**Phần 3 hoàn tất local: 50/50 asset, FloorPlan, responsive và hai chế độ build đạt.** GitHub
Pages là bản demo tĩnh, không phải bản vận hành Next.js/Supabase.

Ngày 01/10/2026, giao diện editorial đã duyệt từ bản preview được áp dụng làm
giao diện mặc định trong repo chính; không có chế độ chuyển giữa UI cũ/mới.
Contact và `/reservation` bổ sung phần thông tin chưa cung cấp và form mô phỏng.
Form không gửi/lưu thông tin khách, không kiểm tra bàn trống và không tạo booking;
chỉ nhập dữ liệu giả khi thử. GitHub Pages cập nhật giao diện qua workflow
`Publish public demo to GitHub Pages` khi push lên nhánh `codex/restaurant-booking-platform`;
chỉ coi bản công khai đã cập nhật sau khi workflow deploy thành công.

## Catalogue hiện tại và chuẩn bị Phần 4

Đối chiếu ngày 30/09/2026 trên `src/data/restaurant.ts`, `supabase/seed.sql`,
mapping media và file trong `public/images/`:

| Nội dung | Trong repo hiện tại |
| --- | --- |
| Tầng / bàn / sức chứa cấu hình | 3 tầng / 22 bàn / 92 chỗ (32 + 34 + 26) |
| Thực đơn | 6 danh mục / 30 món, 9 món nổi bật; tất cả `available=true` ở UI |
| Combo | 4 gợi ý cho 2/4/6/8 khách; không phải món seed hoặc chức năng đặt món |
| Ảnh | 50/50 FINAL assets: 16 restaurant + 30 dish + 4 combo; không canonical placeholder |
| Trang public | 8 trang: Home, Menu, Spaces, 3 trang tầng, Contact và Đặt bàn mô phỏng |

Chi tiết: [không gian và sức chứa](docs/restaurant-world.md),
[menu và giá](docs/menu-canonical.md),
[ảnh và placeholder](docs/asset-integration-status.md).
92 chỗ không phải số chỗ trống hiện tại: chưa có API availability; mỗi booking
chỉ một bàn, tối đa 8 khách và không vượt sức chứa bàn.

Phần 4 đã có implementation Auth/phiên, hồ sơ và authorization; kiểm chứng
Auth/JWT thật đã kiểm chứng một phần với hai Customer: server đọc/lưu hồ sơ,
reload duy trì phiên và logout chặn lại profile đạt. Customer thứ hai đã login
thành công sau lần signup bị giới hạn email trước đó. Runner đã kiểm chứng JWT
A/B thật: grants role/is_active, cách ly đọc/cập nhật hai chiều, cập nhật chính
mình và refresh chủ động đạt. Inactive thật cũng đạt: phiên đang có bị server/RLS
chặn; đã khôi phục active và truy cập hồ sơ lại được. Signup Auth thật với metadata
admin giả tạo Customer active đúng. Phiên QA mới sau xác nhận đã được Auth xác minh
đúng Customer active; chưa quan sát trực tiếp request callback nên không coi phiên
đăng nhập là bằng chứng độc lập cho callback. Ca staff bị giới hạn gửi email.
Cookie lỗi bị từ chối. Hai tài khoản test chuyên dụng đã được operator duyệt
cấp Staff/Admin: login/profile trên Vercel, JWT thật và RLS đọc/cập nhật hồ sơ
đã kiểm chứng; cả hai không được sửa role/is_active. Refresh cookie JWT hết hạn
vẫn chưa chứng nhận. Có runner tương tác
`node scripts/test-identity-live.mjs` hoặc thêm `--browser` cho QA loopback riêng;
xem `docs/database-testing.md`. Chưa tuyên bố toàn bộ integration Phần 4 hoàn tất.
Không coi build hoặc smoke HTTP là chứng nhận đăng nhập/RLS thật.

Cập nhật 02/10/2026: hồi quy typecheck/lint/build/identity smoke đạt. Signup
QA bị giới hạn email, không tạo user/profile mới; operator đã yêu cầu dừng
phần email. Kiểm thử JWT hết hạn tự nhiên đang chạy, chưa có kết quả.
Phần 4 vẫn PARTIAL; xem trạng thái nghiệm thu trong tài liệu kiểm thử.

Cập nhật 02/10/2026, 10:27 Asia/Saigon: callback xác nhận email thật qua ứng dụng
local và signup metadata staff giả đã PASS với một Customer QA mới. Auth xác
minh user confirmed; trusted profile vẫn Customer active, phiên callback đọc
hồ sơ được và logout trở lại Guest. Hồi quy typecheck/lint/contract/HTTP smoke
và normal build PASS. Gate còn lại là JWT hết hạn tự nhiên qua Proxy Production:
runner mới đã xác minh Staff test và đang chờ đến 11:29:46 ngày 02/10 giờ Việt Nam;
đã hẹn kiểm tra kết quả một lần lúc 11:30. Kết quả phiên cũ không truy cập được.
Phần 4 vẫn PARTIAL cho tới khi gate này có bằng chứng; không gán callback local
thành callback Production, không đổi runtime hoặc tự deploy.

Nghiệm thu 02/10/2026: runner JWT hết hạn tự nhiên đã COMPLETE/PASS. Cookie
giữ nguyên đến hết hạn được gửi tới Production `/profile`; Proxy trả cookie
HttpOnly/Secure/Lax và no-store, Auth xác minh cùng user Staff active với JWT
mới có expiry muộn hơn. Request tiếp theo nhận phiên mới và logout đạt.
Phần 4 PASS trong phạm vi Identity/Auth đã thống nhất, kết hợp bằng chứng
callback email/metadata staff trên local và JWT refresh trên Production;
không chứng nhận callback email Production. Các đoạn PARTIAL phía trên là
lịch sử trước nghiệm thu. Không sửa runtime, commit, push hoặc deploy lượt này.

## Identity / Auth · Phần 4

- `/login`, `/signup`, `/profile`, GET `/auth/confirm`, GET/POST `/auth/session`.
- Email/password; signup Customer; yêu cầu xác nhận email. Chưa có reset password.
- Session cookie HttpOnly/SameSite=Lax; Secure khi site URL dùng HTTPS. Proxy
  refresh bằng `getClaims`; server xác minh user bằng `getUser`, đọc role/is_active
  từ profiles qua RLS. Profile thiếu/inactive bị từ chối; chỉ sửa full_name/phone.
- Hai dependency chính thức: `@supabase/ssr` và `@supabase/supabase-js`. Không cần
  browser Supabase client hoặc service-role; browser chỉ gọi endpoint cùng origin.
- Public demo Pages không chạy Auth: `.server.ts` (handler/proxy) bị loại qua
  pageExtensions; `/auth/confirm/page.demo.tsx` chỉ dùng khi export. Các trang
  Identity demo không có form hoặc request Supabase. Workflow không đổi.

Cấu hình local (không gửi key/password vào chat): sao chép `.env.example` thành
`.env.local`, điền `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` được hỗ trợ như fallback; tuyệt đối không
điền secret/service-role vào biến public. `NEXT_PUBLIC_SITE_URL` phải khớp origin
đang sử dụng: `http://127.0.0.1:3002` local, HTTPS khi vận hành. Chạy lại/build lại
sau thay đổi env. Không dùng origin Pages cho Auth thật.

Email provider, signup và yêu cầu Confirm email đã được kiểm tra chỉ đọc trên
development ngày 01/10/2026. Sau khi operator duyệt, đã thêm đúng allowlist callback
`http://127.0.0.1:3002/auth/confirm` trong development; Site URL giữ nguyên.
App hỗ trợ callback PKCE
`code` (mở email trong trình duyệt đã signup) và token_hash/type signup hoặc email
nếu operator đã cấu hình SSR email template. Không tự thay provider/template,
Site URL hoặc redirect allowlist. Liên kết lỗi/hết hạn về login, không nhận next
URL tùy ý. Staff/Admin test đã được operator cấp quyền và kiểm chứng; ứng dụng
không có workflow tự cấp quyền.

`pnpm test:identity:smoke` kiểm tra HTTP local, CSRF, callback và cache headers;
**không** đăng ký user hoặc chứng nhận JWT. Auth/RLS thật cần config và quyền
thử development riêng. Xem trạng thái ở `docs/database-testing.md`.
Pages vẫn mô phỏng; trạng thái nghiệm thu Phần 3 xem tài liệu asset integration.

## Phần 5 · triển khai production được operator duyệt

- `GET /api/availability`: gọi RPC `find_available_tables`, chỉ trả ID/mã bàn,
  mã tầng và sức chứa, không trả thông tin booking/khách hàng.
- `POST /api/bookings`: Customer active, cùng origin, gọi `create_booking` bằng
  phiên người dùng; không nhận role/user ID/source từ client, không dùng service-role.
- Production được bật riêng bằng `BOOKING_MUTATIONS_ENABLED=true`, đúng origin
  `https://moc-vi-restaurant.vercel.app` và project ref `unhybmmbgumyhzaftlli`.
  Local vẫn dùng `BOOKING_LOCAL_MUTATIONS_ENABLED` với project development cô lập.
- Migration `202610010001_availability.sql` đã áp production ngày 02/10/2026,
  theo quyền operator; không seed/reset, không đổi Auth/role hay dữ liệu catalogue.
  Trước migration: 0 booking, 8 hồ sơ, 22 bàn/92 chỗ; RPC tạo booking đã tồn tại.
- Form/FloorPlan giữ thiết kế và catalogue hiện tại, có loading/error/empty/retry,
  key retry chỉ ở bộ nhớ trang. GitHub Pages vẫn không gọi Auth/booking API.
- `pnpm test:booking`: validation/cờ/handler **mock**; thêm
  `BOOKING_TEST_BASE_URL=http://127.0.0.1:3002` để kiểm tra HTTP cờ tắt/CSRF/input.
  `pnpm test:db` chạy SQL trên database mới `mocvi_test_*`, áp tất cả migration theo thứ tự.

Phần 4 và Phần 5 PASS trong phạm vi Identity/Auth và Customer booking đã thống nhất.
Gate hai Customer thật trên Production đã COMPLETE ngày 02/10/2026: một pending/
một 409 khi tranh bàn, cách ly booking/history/notification, retry không tạo trùng
và chặn giả mạo customer/source. Hai booking test được giữ lại; phiên test đã logout.
Callback email được chứng minh local; JWT expiry và booking được chứng minh Production.
Workflow Staff/Admin và scheduler vẫn thuộc các phần sau. Phần 6 bổ sung quản lý
đặt bàn cá nhân cho Customer: danh sách/chi tiết, hủy theo mốc database 60 phút,
history và thông báo nội bộ; không gửi email/SMS.
Xem [kết quả và giới hạn kiểm thử](docs/database-testing.md) và
[nghiệm thu booking production](docs/booking-production.md).

## Phần 6 · Customer booking management

Nghiệm thu 02/10/2026: **PASS trong phạm vi đã thống nhất**. Production đã chạy
bản `36f8288`; list/detail/cancellation/history/notification được kiểm chứng,
35 nhóm SQL integration và các build/HTTP/responsive gates đã đạt.

- `/my-bookings`: Customer active xem các booking của chính mình, trạng thái, bàn,
  thời gian và thông báo nội bộ; Guest/Staff/Admin không được dùng màn hình này.
- `/my-bookings/[id]`: chi tiết, lịch sử trạng thái và nút hủy khi còn đủ thời gian.
  Truy cập booking của Customer khác trả về trang không tìm thấy, không tiết lộ dữ liệu.
- `POST /api/bookings/[id]/cancel`: same-origin, Customer-only, gọi RPC
  `cancel_booking`; không cho cập nhật trực tiếp booking.
- `PATCH /api/notifications/[id]`: chỉ cập nhật `read_at` của notification thuộc
  chính Customer. Thông báo là bản ghi trong site, chưa gửi email/SMS.
- Migration `202610020001_customer_booking_management.sql` đã áp dụng trên
  Supabase production sau khi review; hủy là atomic, concurrency-safe, retry
  không tạo history/notification/audit trùng và đúng mốc **>= 60 phút**.
- Contract/unit tests Phần 6, typecheck, lint, normal build và Pages build đã đạt.
  Live UI cancellation/read_at đã PASS với booking QA được xác định rõ.
  Fixture PostgreSQL sạch đạt 35 nhóm, gồm boundary 60 phút, retry, concurrent
  cancel/confirm/expire, ownership và rollback; xem bằng chứng trong tài liệu kiểm thử.

## Phần 7 · Staff operations · 02/10/2026

Implementation ban đầu đã được bổ sung ở nhánh hiện tại trên local: migration
`202610030001_staff_operations.sql`, API same-origin cho Staff/Admin, khu vực
`/staff`, chi tiết booking, tạo booking phone/walk-in, xác nhận/từ chối/hủy,
check-in, no-show, hoàn tất phục vụ, đổi bàn và cleaning → available.

- Database fixture sạch đạt 38 nhóm; riêng 2 nhóm Staff kiểm tra chuyển trạng thái,
  actual guest count, occupied/cleaning/available, lý do bắt buộc, event/audit và
  chặn Customer.
- Contract route Staff, typecheck, lint, normal build và Pages build đạt.
- GitHub Pages chỉ xuất placeholder Staff; dữ liệu booking và thao tác Staff chỉ
  chạy trên Next.js server/Vercel.
- Migration production và scheduler production **chưa được nghiệm thu trong lượt
  này** vì workspace chỉ có publishable Supabase key, không có phiên SQL Editor
  hoặc quyền database owner. Không coi Phần 7 PASS production khi hai gate này
  chưa có bằng chứng.

### Cập nhật Phần 7 — hardening và triển khai database (02/10/2026)

- Đã bổ sung tìm kiếm mã/tên/điện thoại, lọc tầng, phân trang 25 booking,
  FloorPlan theo tầng/trạng thái vật lý, cảnh báo quá giờ, loading/error/refresh.
- Check-in giữ nguyên số khách đặt; số khách thực tế lưu riêng. Đổi bàn cần khách
  đồng ý; hủy/từ chối/đổi bàn có xác nhận trước thao tác.
- `staff_operation` là RPC Staff duy nhất cho các chuyển trạng thái/dọn bàn;
  receipt private theo actor/request bảo vệ retry kể cả sau thay đổi trạng thái.
  Create phone/walk-in giữ nguyên idempotency key khi thử lại và có environment gate.
- SQL local sạch đạt **49 nhóm**, gồm regression Customer và các ca Staff:
  retry, consent, late check-in, no-show/cancel races, overstay, event rollback,
  Guest/Customer/inactive denial và Admin authorization.
- Đã áp migration Staff `202610030001`–`202610030003` trên
  `unhybmmbgumyhzaftlli` qua SQL Editor được operator duyệt; không seed/reset.
  Guest không có EXECUTE wrapper; authenticated không gọi trực tiếp các hàm nội bộ.
- Đã cài `pg_cron`, đúng một job `mocvi-expire-pending`, mỗi phút, active;
  nhật ký production có `succeeded` tại 14:42/14:43/14:44 UTC ngày 02/10.
  **Chưa coi đây là bằng chứng booking QA hết hạn tự nhiên.**
- Staff test đã đăng nhập domain thật và hồ sơ hiển thị trusted role Staff.
  Phần 7 vẫn **PARTIAL** cho tới khi đủ chu trình JWT/UI production, booking
  QA hết hạn tự nhiên, responsive và deployment cuối được nghiệm thu.

### Phần 7 — kiểm tra production và giới hạn tiếp tục (02/10/2026)

- Deployment `431facd` đã Ready trên `moc-vi-restaurant.vercel.app`, đúng nhánh
  `codex/restaurant-booking-platform`.
- Staff JWT/UI thật đã tạo booking điện thoại có nhãn PHASE7 QA, confirmed ngay,
  khách vãng lai không gắn Customer; đổi bàn T1-B03 → T1-B04 thành công, giữ
  lịch/số khách và history ghi lý do cùng khách đồng ý.
- SQL local sạch mở rộng đạt **52 nhóm**: thêm move/create race, Staff wrapper
  confirm/expire race và walk-in/retry. Fixture walk-in đổi giờ/duration **chỉ ở
  database loopback test**, khôi phục trong finally; không sửa policy production.
- Đã thay xác nhận `window.confirm` bằng bước xác nhận trong form Staff để
  tránh trình duyệt nhúng bị kẹt; khóa dữ liệu khi xác nhận, có Quay lại/Escape.
  Skill ui-ux-pro-max hướng dẫn giữ bước xác nhận cho thao tác có hậu quả.
- Booking QA scheduler được tạo với thời hạn tự nhiên 22:40:24 Asia/Ho_Chi_Minh
  ngày 02/10. Kết nối điều khiển Supabase bị timeout khi đọc kết quả: **chưa
  nghiệm thu hết hạn end-to-end**, không suy ra PASS từ job chạy succeeded.
- Phần 7 vẫn **PARTIAL**: còn chu trình JWT/UI production confirm/reject/cancel,
  walk-in/check-in/complete/ready/no-show, scheduler và responsive đầy đủ.
  Không sửa policy/giờ production hoặc ép trạng thái bàn để lấy PASS.
