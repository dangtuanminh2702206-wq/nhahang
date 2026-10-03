# Mộc Vị Restaurant

Website quản lý và đặt bàn trực tuyến cho một nhà hàng, được phát triển trong
đồ án môn Kỹ thuật phần mềm ứng dụng. Bản Vercel hiện có public UI, Identity,
booking, Customer, Staff và Admin; các mục tiến trình bên dưới có cả bằng chứng
lịch sử. Trạng thái mở rộng mới được theo dõi tại
[completion-backlog.md](docs/completion-backlog.md).

Nhóm mở rộng combo đã có code/migration và kiểm thử local; live/Admin combo chỉ
bật khi `COMBO_CATALOGUE_ENABLED=true` sau rollout database đã kiểm chứng.
Production chưa bật flag: không coi catalogue tham khảo là dữ liệu live. Công cụ
backup mã hóa/restore local được mô tả ở [operations-runbook.md](docs/operations-runbook.md);
đã có backup production mã hóa và kiểm chứng archive, nhưng chưa nghiệm thu
restore cô lập, off-site/key recovery hoặc disaster recovery.

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
| Combo | 4 gợi ý cho 2/4/6/8 khách; có thể chọn trong đơn món sau khi booking được xác nhận |
| Ảnh | 50/50 FINAL assets: 16 restaurant + 30 dish + 4 combo; không canonical placeholder |
| Trang public | 8 trang: Home, Menu, Spaces, 3 trang tầng, Contact và Đặt bàn mô phỏng |

Chi tiết: [không gian và sức chứa](docs/restaurant-world.md),
[menu và giá](docs/menu-canonical.md),
[ảnh và placeholder](docs/asset-integration-status.md).
92 chỗ không phải số chỗ trống hiện tại: API availability chỉ trả snapshot bàn
phù hợp, còn database kiểm tra lần cuối khi tạo booking; mỗi booking chỉ một bàn,
tối đa 8 khách và không vượt sức chứa bàn.

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

### Trạng thái Phần 7 mới nhất — 03/10/2026

Mục này thay thế trạng thái kiểm thử Phần 7 ngày 02/10 ở trên, không xóa lịch sử.

- Staff/Admin production: confirm, reject, hủy pending/confirmed, no-show,
  check-in/số khách thực tế, complete và dọn bàn đã kiểm chứng. Hai chu kỳ
  cleaning → available liên tiếp trên cùng bảng không reload toàn trang đạt;
  request key được cấp lại sau thành công. Phone/đổi bàn đã đạt ngày 02/10.
- Scheduler hết hạn **tự nhiên PASS**: QA cancelled/pending_expired đúng phút
  cron succeeded; 2 history / 2 notifications / 2 audit, không nhân đôi sau chạy lại.
- JWT production: Staff active được nhận ở API; Customer bị chặn trang/API/RPC;
  Guest API 401 và RPC 42501. Admin active thao tác hủy QA thành công.
- Database loopback sạch: **53 nhóm PASS**, gồm predicate check-in/no-show
  tại mốc chính xác và ±1 microsecond. Typecheck/lint/contracts, Pages/normal
  build, HTTP smoke đạt. Responsive Staff 320/704/1024/1600 không overflow.
- Runtime `56735e5` đã push; Vercel báo deployment completed. Không merge main,
  không stage thay đổi 3D. Catalogue vẫn 22 bàn; sau QA cả 22 bàn available.
- **PARTIAL: còn ca tạo walk-in thành công bằng JWT production trong giờ
  phục vụ 10:00–22:00.** Các fixture được operator duyệt chỉ kiểm chứng thao tác
  sau tạo, không thay thế bằng chứng walk-in. Operator chọn tự gọi tiếp sau
  10:00 ngày 03/10; không tự chạy hoặc đổi policy. Chi tiết trong
  [database-testing.md](docs/database-testing.md).

### Nghiệm thu Phần 7 — walk-in production đạt — 03/10/2026

Gate walk-in còn lại đã đạt lúc 10:16 Asia/Saigon bằng phiên Staff JWT thật
trên `moc-vi-restaurant.vercel.app`:

- Booking QA `2c5e4f18-47bf-4136-8c2e-fe9dedb1ff00` được tạo qua form Staff với
  `source=walk_in`, `status=confirmed`, `customer_id=null`, T1-B02, 2 khách.
- Chu trình thực tế đạt: `confirmed → checked_in → completed → cleaning →
  available`; khách thực tế là 2, history có 3 chuyển trạng thái và audit có 3
  bản ghi cho booking.
- Đọc lại production sau khi dọn bàn: 22/22 bàn `available`, không còn bàn
  `cleaning`. Phần 7 **PASS trong phạm vi Staff operations đã thống nhất**.
- Các đoạn PARTIAL phía trên được giữ làm lịch sử; bằng chứng chi tiết ở
  [database-testing.md](docs/database-testing.md).

## Phần 8 · Admin management

Nghiệm thu 03/10/2026: **Phần 8 PASS trong phạm vi Admin management đã kiểm
chứng**, với giới hạn QA quyền trên UI production ghi rõ bên dưới. Runtime
`1b5c1f1` đã push trên nhánh `codex/restaurant-booking-platform`; Vercel báo
deployment success và giao diện mới đã được kiểm tra trên domain chính thức.
`/admin` chỉ cho Admin active truy cập; Staff tiếp tục dùng `/staff`, không
duplicate workflow vận hành. Màn hình Admin hiện có tổng quan booking theo khoảng
ngày, policy/giờ phục vụ/ngày nghỉ, khu vực/bàn, danh mục/món, tài khoản trusted
role và audit gần đây. Mọi mutation đi qua API cùng origin và RPC Admin, không mở
ghi trực tiếp vào bảng.

Migration `supabase/migrations/202610030004_admin_management.sql` bổ sung RPC
SECURITY DEFINER với `search_path` cố định, advisory lock, expected-value conflict,
validation ở database, audit atomic, bảo vệ Admin active cuối cùng và bảo vệ chu
trình bàn occupied/cleaning. Inactive catalogue chỉ mở cho Admin; Guest/Customer
vẫn chỉ đọc dữ liệu public active. Không có upload ảnh, reset mật khẩu, thanh toán,
doanh thu, kho, multi-branch hoặc 3D.

Vercel đọc menu active từ Supabase để thay đổi tên/giá/trạng thái có hiệu lực sau
lần tải mới; GitHub Pages tiếp tục dùng snapshot canonical và không gọi API/Auth.
Nếu database live lỗi, public menu hiển thị trạng thái lỗi thay vì giả dùng snapshot
cũ. Read-only verification đã xác nhận đủ 10 public RPC ở trạng thái
`SECURITY DEFINER`, `authenticated` có EXECUTE, `anon` không có EXECUTE và bốn
policy Admin đọc inactive tồn tại. Migration 005/006 đã áp dụng thành công:
khóa chung với booking/Staff, expected snapshot đầy đủ, audit atomic/no-op,
validation và bảo vệ trạng thái bàn. Database loopback sạch đạt **68 nhóm**;
JWT thật kiểm chứng Admin được sửa, Guest/Customer/Staff bị chặn, stale retry
409, inactive món không lộ public và audit không lộ cho non-Admin.

UI Admin đổi trạng thái phục vụ của món QA đã đồng bộ tới Menu public; sau thử
đã khôi phục dữ liệu gốc và giữ audit. Typecheck/lint/contracts, Pages build
với `/nhahang`, normal build và HTTP smoke tám trang public local đạt. Admin
và các trang public liên quan đã kiểm tra ở 320/704/1024/1600px, không tràn
ngang; không ghi nhận console error. Nhãn form Admin được kiểm tra.

Giới hạn: không thực hiện gửi thay đổi role qua UI production vì cơ chế an
toàn chặn trước request; không tài khoản nào bị đổi quyền. Không tính ca này
là browser PASS; bảo vệ tự hạ quyền đã PASS ở SQL và JWT, race bảo vệ Admin
active cuối cùng PASS local. Đổi bàn sang tầng khác bị chặn cho đến khi có
tọa độ canonical được duyệt. Báo cáo tối đa 93 ngày, truy vấn tối đa 10.000
dòng báo lỗi rõ khi vượt giới hạn; hồ sơ phân trang 25 dòng. Không có upload
ảnh hoặc combo CRUD. Xem [bằng chứng nghiệm thu](docs/database-testing.md).

## Phần 5A · Customer ordering gắn với booking

Module đặt món đã bật trên production `moc-vi-restaurant.vercel.app` sau khi
operator duyệt rollout. Migration `202610030007_combo_catalogue.sql` rồi
`202610030008_customer_orders.sql` đã áp trên project production được operator duyệt;
`COMBO_CATALOGUE_ENABLED=true` và `ORDER_MUTATIONS_ENABLED=true` được lưu cho
Vercel Production. Runtime `6b435ab` đã deploy và kiểm thử HTTP thật với
Customer/Staff test, đối chiếu trực tiếp database; không dùng mock làm bằng chứng live.

- Customer active chỉ đặt món cho booking của chính mình khi booking đã
  `confirmed` hoặc `checked_in`; mỗi booking có tối đa một đơn.
- Database xác minh món/combo còn phục vụ, số lượng nguyên dương, tính tổng phía
  server và lưu snapshot tên/giá/thành phần combo. Không có giới hạn số lượng
  nghiệp vụ ngoài validation số nguyên và giới hạn tổng kỹ thuật.
- Customer được gửi, xem, sửa hoặc hủy khi đơn còn `Chờ xác nhận`. Staff/Admin
  chuyển đơn qua `Đã xác nhận → Đang chuẩn bị → Đã phục vụ`, hoặc hủy có lý do.
  Booking bị hủy/từ chối/không đến sẽ tự hủy đơn còn hoạt động; booking không
  hoàn tất khi đơn chưa được phục vụ hoặc hủy.
- Idempotency, optimistic version conflict, RLS/ownership, race, audit, history
  và thông báo nội bộ được kiểm tra trong SQL. Không có thanh toán online, đặt
  cọc, hoàn tiền, tồn kho, email/SMS giao dịch; số tiền chỉ là dự kiến và ghi rõ
  **Thanh toán trực tiếp tại quầy nhà hàng.**
- UI nằm trong chi tiết booking Customer và chi tiết booking Staff; Pages vẫn là
  demo tĩnh. Customer mở **Đặt bàn của tôi → Chi tiết booking đã xác nhận** để
  gửi món; Staff mở chi tiết booking để xử lý đơn.

Fixture `ORDER QA` đạt 15 assertions: tạo booking/xác nhận, gửi món + combo,
snapshot/tổng server, retry không trùng, validation, cập nhật pending, chặn quyền
Customer và sửa sau xác nhận, Staff confirmed/preparing/served, history/notification/
audit. Booking QA đã hủy, không giữ lịch bàn; đơn served và bằng chứng audit được
giữ, không xóa lịch sử. Catalogue public vẫn có 30 món và 4 combo.
Không công khai số liệu vận hành, tài khoản hoặc mã fixture. Chi tiết kiểm thử ở
[database-testing.md](docs/database-testing.md#production-order-rollout).

Fixture local mới đạt **86 nhóm SQL PASS** trên database `mocvi_test_*` sạch,
bao gồm hồi quy migration 001–008 và các ca order. Typecheck/lint, normal build
và Pages build/export với 50 asset cũng đạt. Xem [database-testing.md](docs/database-testing.md).

## Phần 9 · System QA, hardening và CI

Ngày 03/10/2026, Phần 9 **PASS trong phạm vi system QA đã thực hiện**. Đã bổ sung
`.github/workflows/ci.yml` với PostgreSQL service cô lập, quyền `contents: read`,
contract/regression tests, SQL integration, normal build, HTTP smoke và Pages build
tuần tự. Không workflow nào cần Supabase credentials, tài khoản test, email hoặc
mutation cloud.

- Database loopback sạch `mocvi_test_phase9_20261003`: **68 nhóm PASS**.
- Identity, booking, Customer booking, Staff contract và asset/spatial checks PASS.
- Normal build, Pages build, 50 asset decode, 8 public Pages routes, basePath
  `/nhahang`, 590 tham chiếu link/asset và loại trừ API/private runtime PASS.
- Local HTTP smoke với origin loopback và Supabase HTTP mock 401 tạm thời PASS
  cho public/Identity/CSRF, guest fail-closed, booking mutation-off và 50 asset
  response. Không ghi dữ liệu Supabase.
- UI responsive/accessibility trước đó được tái sử dụng vì commit này chỉ đổi
  script/CI, không đổi component; bằng chứng 320/704/1024/1600px, nhãn và console
  vẫn áp dụng cho runtime `1b5c1f1`.

Alias `test:identity:contract` và `test:public-assets` được khai báo trong
`package.json` để local/CI gọi cùng một lệnh. Commit CI cuối là `d88798b`, đã
PASS trên [GitHub Actions](https://github.com/dangtuanminh2702206-wq/nhahang/actions/runs/37114247149)
và [GitHub Pages](https://github.com/dangtuanminh2702206-wq/nhahang/actions/runs/37114247136);
kiểm tra [Vercel](https://vercel.com/minh-5f07/nhahang/3xxV6QZqbGuryozVb3RJ9WrMNQy4)
cũng PASS cho commit này. Không stage các thay đổi 3D, panorama và tooling ngoài
phạm vi.

## Phần 10 · Final handover & operational readiness

Phần 10 đã bổ sung bộ tài liệu bàn giao, hướng dẫn sử dụng và runbook vận hành:

- [Hướng dẫn sử dụng](docs/user-guide.md): Guest, Customer, Staff, Admin, kịch
  bản demo và lỗi thường gặp.
- [Runbook vận hành](docs/operations-runbook.md): local/CI/deployment, migration,
  scheduler, chẩn đoán, rollback, backup/restore và checklist release.

Trạng thái hiện tại: **PARTIAL — sẵn sàng demo và vận hành thử có kiểm soát**.
Các gate code/CI/deployment của Phần 9 đã PASS và được tái sử dụng theo commit/
ngày ghi trong tài liệu kiểm thử. Backup/restore Supabase production chưa được
xác minh, người phụ trách vận hành còn placeholder và cửa sổ rollback chưa được
owner xác nhận. Chưa công bố production operational readiness đầy đủ.

Các giới hạn sản phẩm đã chốt vẫn giữ nguyên: callback email production chưa được
chứng minh, role UI production bị cơ chế an toàn chặn trước request, đổi tầng bàn
cần tọa độ canonical, Pages là demo tĩnh, chưa có upload ảnh, reset password,
email/SMS giao dịch, thanh toán online/payment, analytics, multi-branch và
3D/panorama.

## Mở rộng sau bàn giao · 03/10/2026

Yêu cầu mới mở phạm vi các hạng mục trước đây chưa triển khai. Nhóm đầu bổ sung
`/forgot-password`, `/auth/recovery`, `/reset-password`, API mật khẩu cùng origin
và `/api/health` (liveness, không chứng nhận DB/Auth/scheduler readiness).
Recovery dùng Supabase PKCE hoặc OTP SSR, kiểm tra profile active, chỉ cập nhật
mật khẩu của user đang được Auth xác minh và thu hồi refresh sessions sau update.

Contract/HTTP/browser guest và hai chế độ build đã kiểm tra local. Email thật,
callback production và login bằng mật khẩu mới chưa được chứng minh. Không có
cloud mutation trong nhóm này. Bằng chứng SQL hồi quy local: 68 nhóm PASS.

Dashboard Supabase xác nhận Free Plan không có project backups; restore vẫn
chưa kiểm thử. Xem [runbook](docs/operations-runbook.md) và
[bảng tồn đọng](docs/completion-backlog.md) để phân biệt đã làm/chờ kiểm chứng/TODO.
