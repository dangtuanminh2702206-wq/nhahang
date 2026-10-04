# Lịch sử kiến trúc trước bàn giao đồ án

Các đoạn sau là nhật ký triển khai theo từng thời điểm, không phải hướng dẫn vận hành hiện tại. Những câu “chưa triển khai” chỉ áp dụng cho mốc ghi nhận. Kiến trúc hiện hành xem [architecture.md](architecture.md); bằng chứng nghiệm thu xem [database-testing.md](database-testing.md).

# Kiến trúc Mộc Vị Restaurant

## Bối cảnh hệ thống

Mộc Vị Restaurant là website quản lý và đặt bàn trực tuyến cho một nhà hàng.
Hệ thống tập trung vào vòng đời booking từ tìm bàn đến hoàn thành lượt phục vụ.
Order, hóa đơn, thanh toán, doanh thu, kho và nhiều chi nhánh nằm ngoài phạm vi
MVP.

## Vai trò

- **Guest:** xem nội dung công khai, menu và tìm bàn khả dụng.
- **Customer:** tạo, xem và hủy booking của chính mình.
- **Staff:** xử lý booking và vận hành bàn.
- **Admin:** có quyền của Staff và quản lý cấu hình, tài khoản, menu, bàn và báo
  cáo booking.

## Module dự kiến

- **Public:** thông tin nhà hàng, menu, khu vực và tìm bàn.
- **Identity:** đăng ký, đăng nhập, hồ sơ và phân quyền.
- **Booking:** tìm khả dụng, tạo, hủy và theo dõi booking.
- **Operations:** xác nhận, từ chối, nhận khách, hoàn thành, no-show và đổi bàn.
- **Catalog:** khu vực, bàn, danh mục và món ăn.
- **Administration:** lịch hoạt động, tài khoản, thông báo, báo cáo và audit log.

Các module trên mô tả ranh giới nghiệp vụ, không yêu cầu tạo thư mục hoặc tầng
trừu tượng trước khi có implementation thực tế.

## Nguyên tắc phân tách

- Route và layout nằm trong `src/app` theo App Router.
- Component hiển thị dùng chung chỉ được đưa vào `src/components` khi có nhu cầu
  tái sử dụng thực tế.
- Business rule không phụ thuộc UI. Với booking hiện tại, SQL là nguồn thực thi
  chính sách; các giá trị cấu hình nằm trong `restaurant_settings`, không nhân
  bản thành bộ hằng số TypeScript.
- Data access được gọi từ server; thông tin bí mật không đi vào Client Component.
- Server Component là mặc định. Chỉ thêm Client Component cho tương tác cần
  trạng thái trình duyệt.
- Kiểm tra authorization được thực hiện ở server, không chỉ bằng cách ẩn giao
  diện.

## Cấu trúc hiện tại

```text
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── menu/page.tsx
│   ├── contact/page.tsx
│   ├── reservation/page.tsx
│   └── spaces/
│       ├── page.tsx
│       └── [slug]/page.tsx
├── components/
│   ├── asset-image.tsx
│   ├── floor-plan.tsx
│   ├── media-placeholder.tsx
│   ├── menu-browser.tsx
│   ├── reservation-preview.tsx
│   ├── space-stories.tsx
│   ├── site-footer.tsx
│   └── site-header.tsx
├── config/
│   └── site.ts
└── data/
    ├── media.ts
    └── restaurant.ts

src/lib/
└── media.server.ts

docs/
├── architecture.md
├── asset-integration-status.md
├── asset-manifest.md
├── database.md
├── database-testing.md
├── menu-canonical.md
└── restaurant-world.md

supabase/
├── migrations/
│   └── 202609300001_foundation.sql
├── tests/
│   └── development-smoke.sql
└── seed.sql

scripts/
└── test-database.mjs
```

Các thư mục `components`, `features`, `lib` và `types` chỉ được tạo khi giai đoạn
sau có file sử dụng thực tế.

Phần 3A bổ sung `components` và `data` vì đã có nhu cầu tái sử dụng thật: header/footer,
placeholder ảnh, FloorPlan/TableNode và bộ lọc thực đơn. `src/data/restaurant.ts` là
catalogue public dùng chung cho Home, Spaces, FloorPlan và Menu; UI không tự khai báo
lại món hoặc bàn theo trang. Seed trong repo mang cùng catalogue cho môi trường demo,
không kéo Supabase hay secret vào Client Component.

Phần 3B dùng `src/data/media.ts` quản lý path/alt/ratio/object-position cho toàn bộ
50 asset dự kiến. `media.server.ts` kiểm tra file trong `public` khi render/build;
MenuBrowser chỉ nhận metadata serializable về trạng thái available/pending.
`AssetImage` là Client Component nhỏ để xử lý lỗi tải, dùng `next/image` và fallback
giữ nguyên tỷ lệ. Ảnh pending không phát sinh request tới file chưa tồn tại. Khi bổ
sung ảnh đúng expected path, cần build/deploy lại các trang tĩnh.

## Quyết định đã chốt

- Một nhà hàng, một múi giờ `Asia/Ho_Chi_Minh`.
- Giao diện tiếng Việt; code và tên kỹ thuật bằng tiếng Anh.
- Next.js App Router, TypeScript strict và Tailwind CSS.
- Supabase PostgreSQL, Auth và Storage dự kiến dùng từ Phần 2 trở đi.
- Vercel là nền tảng triển khai.
- Guest, Customer, Staff và Admin là bốn vai trò của hệ thống.
- Một booking gắn với một bàn; chưa hỗ trợ ghép hoặc tách bàn.
- Có đặt món gắn với booking đã xác nhận: snapshot món/giá, trạng thái đơn,
  quyền Customer/Staff và thông báo nội bộ. Không triển khai hóa đơn, thanh toán
  online, doanh thu hoặc kho; tiền đơn chỉ là dự kiến và thanh toán tại quầy.

## Nền tảng database đã viết ở Phần 2

- Nền tảng ban đầu có 12 bảng với RLS/default-deny; module order bổ sung các bảng
  `orders`, `order_items`, `order_history`, `order_notifications` và receipt
  private, vẫn dùng FK RESTRICT bảo toàn lịch sử.
- `create_booking` và `confirm_booking` là RPC database có kiểm tra danh tính;
  chưa có API route/Server Action hoặc client Supabase trong Next.js.
- GiST exclusion constraint chống trùng lịch bàn và lịch sử dụng của Customer.
  Advisory transaction lock chung tuần tự hóa mutation cho một nhà hàng,
  bảo vệ giới hạn 3 booking và idempotency ở READ COMMITTED.
- Booking/history/notification/audit ghi trong cùng giao dịch; expiration là
  helper private, cần scheduler owner cấu hình riêng trước khi vận hành.
- Không ORM, không thêm abstraction/module rỗng. Chỉ thêm `pg` ở devDependencies
  để script test điều khiển các kết nối PostgreSQL thật, kiểm thử cạnh tranh và
  SET ROLE. Next.js không sử dụng dependency này khi phục vụ ứng dụng.

Module order dùng RPC SECURITY DEFINER, không cấp ghi trực tiếp cho bảng. Customer
chỉ thao tác trên booking của mình ở trạng thái `confirmed`/`checked_in`; Staff và
Admin xử lý state machine. Giá, tên, combo components và total được lấy từ
catalogue trong transaction rồi snapshot vào `order_items`. Feature gate production
được bật riêng sau khi migration 007/008 được áp và kiểm tra live; Pages không có
Auth/booking/order runtime.

Chi tiết ERD, data dictionary, ranh giới thời gian và phần chưa triển khai nằm
trong [database.md](database.md). Migration/seed đã chạy trên Supabase development;
18 nhóm kiểm thử PostgreSQL local và smoke test quyền trên Supabase đã đạt ở
catalogue Phần 2 cũ. Fixture hiện đã cập nhật và 18 nhóm test local đạt với seed
Phần 3A; development đã sao lưu và thay catalogue có xác nhận, smoke cloud đạt.
Ứng dụng có lớp Identity kết nối khi có cấu hình server; Auth/JWT thật chưa được kiểm thử.

## Dành cho các giai đoạn sau

### Baseline trước Phần 4 · cập nhật giao diện 01/10/2026

- UI và seed repo khớp 3 area/tầng, 22 bàn, 92 chỗ cấu hình, 6 danh mục/30 món.
  4 combo chỉ thuộc data public, không phải thực thể database. Chi tiết ở
  [restaurant-world.md](restaurant-world.md) và [menu-canonical.md](menu-canonical.md).
- 8 trang public: `/`, `/menu`, `/spaces`, `/spaces/floor-1`,
  `/spaces/floor-2`, `/spaces/floor-3`, `/contact`, `/reservation`. Chọn bàn chỉ xem thông tin vị trí;
  `neutral/selected` không chứng minh khả dụng thực tế. Menu có 7 tab
  (Combo + 6 danh mục). Giao diện editorial đã duyệt là mặc định; CSS nằm trong
  `globals.css`, không có hai template song song. CTA đặt bàn dẫn tới `/reservation`:
  form mô phỏng phía client, đồng bộ lựa chọn FloorPlan với select nhưng không gọi
  API, kiểm tra availability, lưu thông tin khách hoặc tạo booking. Các lựa chọn
  giờ/số khách trong form chỉ minh họa UI, không thay thế chính sách SQL. Contact
  chưa có địa chỉ/điện thoại/email xác nhận nên không có bản đồ. Các route Identity
  được bổ sung ở Phần 4 bên dưới; chưa có trang vận hành.
- Phần 3 giao diện đã chốt, đủ FINAL 50/50 WebP (16 restaurant/30 dish/4 combo).
  Spatial spec mới nằm trong restaurantFloors, dùng chung cho FloorPlan/reservation;
  nearbyLandmarks chỉ chuẩn bị metadata 360, không viewer. Gate cuối xem asset-integration-status.md.
- GitHub Pages đã xuất bản giao diện được duyệt từ commit `4450a88`, dùng static export,
  basePath `/nhahang`, output `.next-pages`, ảnh gốc không optimize. Chế độ
  build thông thường giữ Next.js server/ảnh tối ưu; Vercel vẫn là hướng vận hành
  Auth/booking. Pages không thực thi Server Actions hay API ứng dụng.
- Fixture và smoke SQL đã cập nhật; 18 nhóm test và smoke local đạt với catalogue
  mới. Development đã sao lưu/thay seed có xác nhận, catalogue khớp UI và smoke
  cloud đạt; không tạo booking/profile thử. Xem [database-testing.md](database-testing.md).
- Phần 4 chỉ tích hợp Auth/phiên, hồ sơ và authorization server-side. Guest là
  người chưa đăng nhập, không phải giá trị `profiles.role`; đăng ký mặc định
  Customer, không nhận role Staff/Admin từ metadata người dùng. Có role Admin
  không đồng nghĩa đã có API quản trị danh mục hoặc cấp quyền.

Ảnh pending không chặn Phần 4. Catalogue development đã đối chiếu sau cập nhật;
Phần 4 cần kiểm chứng Auth/JWT qua API thật. Không chạy seed trên dữ liệu có
booking để ép khớp UI.

- Trước khi vận hành booking: cấu hình scheduler expiration và kiểm thử JWT/Auth
  trên Supabase development khi có authentication flow.
- Phần 3: design system/public đã chốt, đủ 50 ảnh FINAL và đồng bộ spatial FloorPlan.
- Phần 4: có implementation authentication, hồ sơ và authorization; một Customer đã kiểm chứng đọc/lưu hồ sơ, reload và logout. Signup mới/các ca JWT còn thiếu xem database-testing.md.
- Phần 5–8: booking, Customer, Staff và Admin.
- Phần 9: system QA, hardening và CI; Phần 10: kiểm thử bàn giao cuối, vận hành
  và checklist phát hành nếu được duyệt riêng.

## Identity implementation · 01/10/2026

- `src/lib/supabase/config.ts`: public publishable key hoặc legacy anon fallback,
  từ chối secret/service-role, tắt hoàn toàn khi static demo.
- `server.ts`: request-scoped cookie client; `origin.ts`: origin cấu hình để kiểm
  tra CSRF và redirect, tránh hostname loopback bị Proxy chuẩn hóa.
- `src/proxy.server.ts`: refresh cookies/JWT claims; response private/no-store.
  Default function export cần thiết với extension tùy chọn và Turbopack hiện tại.
- `src/lib/identity.ts`: getCurrentUser/getCurrentProfile, requireAuthenticatedUser,
  requireActiveUser/requireRole. React cache chỉ memoize trong request; không cache
  profile dùng chung giữa người dùng. User được Auth xác minh và đã confirm email;
  role/is_active đọc database. RLS khiến profile inactive không đọc được: fail closed.
- `/auth/session/route.server.ts`: GET chỉ trả trạng thái phiên; POST JSON cùng
  origin cho login/signup/logout/profile. Không trả token, email hoặc profile ID
  qua status endpoint; update whitelist full_name/phone, lọc id bằng auth user.
- `/auth/confirm/route.server.ts`: PKCE/code hoặc OTP token_hash signup/email;
  redirect cố định /profile hoặc /login, không tin query next.
- `/login`, `/signup`, `/profile` ưu tiên Server Components; IdentityForm và
  AccountControl xử lý tương tác. Không thêm browser SDK client khi chưa cần.
- `pageExtensions` server: server.ts/tsx/ts; demo: demo.tsx/tsx/ts. Server handler
  và Proxy không được discovery trong export. Callback demo có page.demo.tsx;
  Identity pages demo không gọi cookies/Auth/connection hoặc nhận mật khẩu.

Không đổi migration/seed/grants/RLS; không cấp role hoặc deactivate tài khoản.
Tại baseline Phần 4 chưa làm booking/availability/dashboard/scheduler. Quên mật khẩu và Staff/Admin
test account ngoài phạm vi hiện tại. Public URL/key đã cấu hình local; kiểm chứng
cloud đã kiểm chứng một Customer, còn cần ca signup/callback/refresh và tài khoản
thứ hai cho cross-user, xem
database-testing.md; không coi implementation là chứng nhận tích hợp đã hoàn tất.

## Booking foundation · Phần 5 local · 01/10/2026

- `booking-input.ts`: kiểu dữ liệu và validation transport; không nhân bản policy SQL.
- `booking.ts` server-only: mapping lỗi và cờ local-only fail closed. Cờ không nằm
  trong `next.config.env`; UI chỉ nhận Boolean từ Server Component mỗi request.
- Availability handler chỉ gọi public RPC, projection 4 trường; Guest không đọc bookings.
  Lookup read-only bỏ pending hết hạn; create_booking dọn expiration dưới lock rồi
  kiểm tra lại policy/exclusion. Snapshot tìm bàn không phải giữ chỗ.
- Booking handler kiểm tra origin/JSON/whitelist, Customer active qua helpers Phần 4,
  RPC dưới cookie session; customer/source không do client quyết định. Chỉ trả ID,
  trạng thái và expiresAt của kết quả thuộc user. Không cache phản hồi hoặc log payload.
- ReservationPreview giữ một giao diện: demo tĩnh trên Pages, tìm bàn/chờ backend
  trên server. Khi cờ tắt, không gửi liên hệ; không nhận booking cloud. Khi bật local,
  khóa thao tác đang gửi, giữ key cho retry cùng payload, xóa khả dụng khi đổi slot.
- FloorPlan nhận danh sách mã khả dụng đã lọc, disable bàn không phù hợp và có nhãn
  bằng chữ. Catalogue/ảnh/logic RPC foundation không thay đổi. Proxy thêm reservation
  và booking endpoint để refresh cookie; Guest lookup không bị yêu cầu đăng nhập.
- Chưa có Supabase local Auth/PostgREST: toàn tuyến JWT/booking và happy-path UI
  còn NOT RUN. Không thêm Auth bypass, không dùng service-role hay mock làm bằng chứng JWT.
- Không có dashboard/scheduler/cloud migration; Phần 3 đã đủ ảnh FINAL và Phần 4 còn
  các ca Auth chưa kiểm chứng. Xem database-testing.md trước khi bật nghiệp vụ cloud.

## Customer booking management · Phần 6 · 02/10/2026

- Customer active có các route server-rendered `/my-bookings` và
  `/my-bookings/[id]`; truy vấn dùng request-scoped Supabase client/RLS, không
  dùng service-role hoặc client-side booking query.
- `POST /api/bookings/[id]/cancel` chỉ gọi RPC `public.cancel_booking(uuid)`;
  RPC lấy `auth.uid()`, kiểm tra profile Customer active + ownership, dùng cùng
  advisory lock/row lock với các mutation booking và chấp nhận đúng mốc 60 phút.
- Hủy ghi `booking_history`, notification nội bộ và `audit_logs` trong cùng
  transaction. Retry trạng thái cancelled là no-op; các trạng thái khác ngoài
  pending/confirmed bị từ chối.
- Policy `history_read` đã được siết để Customer chỉ đọc history của booking
  mình; Staff/Admin giữ quyền đọc vận hành hiện có. Notification `read_at` chỉ
  cập nhật qua route same-origin và recipient hiện tại.
- UI giữ editorial design đã duyệt, không tạo dashboard/card grid; có loading,
  empty/error, focus/error feedback và link “Đặt bàn của tôi”. GitHub Pages chỉ
  export placeholder tĩnh, không thực thi Auth/booking.

## Staff operations · Phần 7 · 02/10/2026

Khu vực `/staff` dùng Server Component để đọc dữ liệu qua Supabase RLS và Client
Component tối thiểu cho các nút thao tác. Mọi chuyển trạng thái/đổi bàn/dọn bàn gọi
RPC `staff_operation`; các hàm staff_update/move/ready chỉ là helper nội bộ. Route
kiểm tra same-origin, JSON, role Staff/Admin active và chỉ trả DTO tối thiểu.

Migration `202610030001_staff_operations.sql` giữ trạng thái booking và trạng thái
vật lý bàn trong cùng transaction, ghi history/notification/audit bằng helper hiện
có. Phone/walk-in tái sử dụng `create_booking` với source vận hành; không liên kết
khách vãng lai vào Customer chỉ bằng số điện thoại/email. Migration 001/002/003
đã áp production; receipt private theo actor/request bảo vệ retry, kể cả khi
booking đã đổi trạng thái sau lần gọi đầu. Client không có EXECUTE helper hay
UPDATE booking/table trực tiếp.

Job `mocvi-expire-pending` mỗi phút đã kiểm chứng hết hạn tự nhiên trên production
ngày 03/10. Staff/Admin workflow, quyền production và ca walk-in trong giờ phục
vụ thật đã đạt; Phần 7 PASS trong phạm vi Staff operations. Xem
database-testing.md để phân biệt fixture owner được duyệt, SQL local, HTTP local
và JWT/UI production.

### Admin management · Phần 8

Admin dùng Server Component `/admin` để đọc snapshot quản trị và Client Component
chỉ cho form/filter. API `POST /api/admin` kiểm tra same-origin, content type,
payload whitelist và `requireRole(["admin"])`; actor/role không nhận từ client.
Các mutation policy, lịch, khu vực/bàn, menu và profile gọi RPC trong migration
`202610030004_admin_management.sql`. RPC là SECURITY DEFINER với `search_path = ''`,
kiểm tra `auth.uid()` qua profile Admin active, khóa transaction chung, expected
value chống lost update và ghi `audit_logs` trong cùng transaction. Không cấp
INSERT/UPDATE/DELETE trực tiếp cho authenticated.

Public Vercel menu dùng `src/lib/menu-live.ts`: code, ảnh và nội dung editorial
canonical vẫn ở data layer; tên, mô tả, giá, active/available, featured và nhóm
được ghép từ catalogue active trong database. Khi không có Supabase (GitHub Pages),
trang dùng snapshot repo. Khi live database lỗi, trang báo lỗi thay vì hiển thị
snapshot như dữ liệu online. Combo không bị biến thành thực thể database; Admin
không có combo CRUD.

Public Home/Menu đọc tên, giá, ảnh và trạng thái món live. Home/Spaces/chi tiết
tầng/Reservation ghép khu vực và capacity/description/active với coordinate
canonical bằng code ổn định qua `spaces-live.ts`. Không tạo vị trí bàn mới.
Giờ phục vụ ở Home/Contact/Footer đọc business_hours; lịch nghỉ vẫn được kiểm
tra ở availability/create_booking. Live read lỗi hiển thị lỗi, không giả dùng
snapshot. Pages không gọi Supabase/API và giữ toàn bộ snapshot canonical.

Báo cáo Admin giới hạn 93 ngày, ngày kết thúc inclusive bằng upper bound ngày
kế tiếp theo UTC+7. Booking/profile được đọc thành các trang 500 dòng để tránh
PostgREST cắt ngầm; vượt 10.000 dòng báo lỗi thay vì báo cáo thiếu. Danh sách
hồ sơ hiển thị 25 dòng/trang sau tìm kiếm. Thay quyền/active cần xác nhận; xóa
lịch cần xác nhận và lý do nhập trực tiếp.

# Nhật ký README — bảo toàn trước bàn giao 04/10/2026

Các kết luận dưới đây thuộc mốc triển khai tương ứng; xem README và architecture.md cho trạng thái hiện hành.

## Nhật ký triển khai theo thời điểm

Các mục Phần 1–10 bên dưới giữ bằng chứng lịch sử. Câu “chưa triển khai” chỉ áp
dụng tại mốc ghi nhận, không phải trạng thái hiện hành. Dùng tài liệu bàn giao
và kết luận mới nhất trong database-testing.md để đánh giá bản nộp môn học.

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

- [ERD, data dictionary, policy, quyền và migration/seed](database.md)
- [Kiểm thử database và giới hạn kiểm chứng](database-testing.md)

Phần 3A có Home, Spaces, ba trang tầng, FloorPlan tương tác và Menu public.
Phần 3 đã tích hợp bộ `moc-vi-ai-assets-FINAL.zip`: 16 ảnh nhà hàng, 30 ảnh món
và 4 combo (50/50), giữ nguyên bytes/path. FloorPlan dùng spatial spec mới trong
data chung: 22 bàn/92 chỗ, không suy vị trí từ isometric. Xem
[trạng thái tích hợp và kết quả nghiệm thu](asset-integration-status.md).
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

Chi tiết: [không gian và sức chứa](restaurant-world.md),
[menu và giá](menu-canonical.md),
[ảnh và placeholder](asset-integration-status.md).
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
Xem [kết quả và giới hạn kiểm thử](database-testing.md) và
[nghiệm thu booking production](booking-production.md).

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
  [database-testing.md](database-testing.md).

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
  [database-testing.md](database-testing.md).

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
ảnh hoặc combo CRUD. Xem [bằng chứng nghiệm thu](database-testing.md).

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
[database-testing.md](database-testing.md#production-order-rollout).

Fixture local mới đạt **86 nhóm SQL PASS** trên database `mocvi_test_*` sạch,
bao gồm hồi quy migration 001–008 và các ca order. Typecheck/lint, normal build
và Pages build/export với 50 asset cũng đạt. Xem [database-testing.md](database-testing.md).

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

- [Hướng dẫn sử dụng](user-guide.md): Guest, Customer, Staff, Admin, kịch
  bản demo và lỗi thường gặp.
- [Runbook vận hành](operations-runbook.md): local/CI/deployment, migration,
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
chưa kiểm thử. Xem [runbook](operations-runbook.md) và
[bảng tồn đọng](completion-backlog.md) để phân biệt đã làm/chờ kiểm chứng/TODO.

### Nghiệm thu quản lý quyền cô lập · 04/10/2026

Gate đổi role/khóa tài khoản qua UI, từ chối inactive, bảo vệ Admin duy nhất và
stale-update conflict đã PASS trên Next local + SQL RLS/RPC thật với Auth giả
lập. Full SQL suite đạt 86 nhóm. Không thay quyền production; không suy thành
JWT production PASS. Xem [bằng chứng kiểm thử](database-testing.md#role-ui-cô-lập--04102026)
và mục R03 trong [backlog](completion-backlog.md).
