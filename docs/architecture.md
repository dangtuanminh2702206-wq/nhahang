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
- Không triển khai order, hóa đơn, thanh toán, doanh thu hoặc kho trong MVP.

## Nền tảng database đã viết ở Phần 2

- 12 bảng với RLS/default-deny, grants theo cột, FK RESTRICT bảo toàn lịch sử.
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
- Phần 9–10: kiểm thử, CI, Vercel và bàn giao.

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
