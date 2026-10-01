# Mộc Vị Restaurant

Website quản lý và đặt bàn trực tuyến cho một nhà hàng, được phát triển trong
đồ án môn Kỹ thuật phần mềm ứng dụng. Phiên bản hiện tại có nền tảng database và
giao diện public đã chốt; ảnh còn thiếu và các module nghiệp vụ sẽ được triển
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
Phần 3B.1 đã tích hợp bộ ảnh AI accepted partial: 16 ảnh nhà hàng và 20 ảnh món.
10 ảnh món cùng 4 combo final còn pending và dùng fallback. Xem
[trạng thái tích hợp và path cần bổ sung](docs/asset-integration-status.md).
Sau khi copy ảnh accepted mới vào đúng path, build/deploy lại để cập nhật trang tĩnh.

**Phần 3: giao diện đã chốt, chờ bổ sung ảnh; chưa hoàn tất toàn bộ.** GitHub
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
| Ảnh | 36/50 expected assets; thiếu 10 ảnh món và 4 ảnh combo |
| Trang public | 8 trang: Home, Menu, Spaces, 3 trang tầng, Contact và Đặt bàn mô phỏng |

Chi tiết: [không gian và sức chứa](docs/restaurant-world.md),
[menu và giá](docs/menu-canonical.md),
[ảnh và placeholder](docs/asset-integration-status.md).
92 chỗ không phải số chỗ trống hiện tại: chưa có API availability; mỗi booking
chỉ một bàn, tối đa 8 khách và không vượt sức chứa bàn.

Phần 4 đã có implementation Auth/phiên, hồ sơ và authorization; kiểm chứng
Auth/JWT thật đã kiểm chứng một phần với một Customer: server đọc/lưu hồ sơ,
reload duy trì phiên và logout chặn lại profile đạt. Signup mới còn bị giới hạn
email; callback, refresh khi hết hạn và các ca quyền/cross-user chưa kiểm chứng.
Không coi build hoặc smoke HTTP là chứng nhận đăng nhập/RLS thật.

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
development ngày 01/10/2026. Operator còn cần kiểm tra allowlist callback
`http://127.0.0.1:3002/auth/confirm` trong development. App hỗ trợ callback PKCE
`code` (mở email trong trình duyệt đã signup) và token_hash/type signup hoặc email
nếu operator đã cấu hình SSR email template. Không tự thay provider/template,
Site URL hoặc redirect allowlist. Liên kết lỗi/hết hạn về login, không nhận next
URL tùy ý. Không có Staff/Admin test account hoặc workflow tự cấp quyền.

`pnpm test:identity:smoke` kiểm tra HTTP local, CSRF, callback và cache headers;
**không** đăng ký user hoặc chứng nhận JWT. Auth/RLS thật cần config và quyền
thử development riêng. Xem trạng thái ở `docs/database-testing.md`.
Reservation vẫn mô phỏng; ảnh pending không chặn Auth nhưng Phần 3 chưa hoàn tất.
