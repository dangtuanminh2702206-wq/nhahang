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
kỳ khóa bí mật nào. Schema đã áp dụng trên Supabase development; ứng dụng Next.js
chưa kết nối Supabase hoặc Resend trong giai đoạn này.

## Kiến trúc

Quyết định kiến trúc và cấu trúc module dự kiến được ghi tại
[`docs/architecture.md`](docs/architecture.md).

## Bản xem thử trên GitHub Pages

Workflow `.github/workflows/pages.yml` xuất bản giao diện public từ nhánh
`codex/restaurant-booking-platform`. Repository cần bật Settings → Pages →
Source: GitHub Actions. Bản public đã xuất bản thành công từ commit `7402752`:
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
Phần 3A; chưa có bằng chứng kiểm thử lại hoặc áp dụng seed mới lên cloud. Script
test còn tham chiếu catalogue cũ; xem giới hạn trong tài liệu kiểm thử.
Chưa triển khai authentication flow, API ứng dụng, giao diện booking/vận hành
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

## Catalogue hiện tại và chuẩn bị Phần 4

Đối chiếu ngày 30/09/2026 trên `src/data/restaurant.ts`, `supabase/seed.sql`,
mapping media và file trong `public/images/`:

| Nội dung | Trong repo hiện tại |
| --- | --- |
| Tầng / bàn / sức chứa cấu hình | 3 tầng / 22 bàn / 92 chỗ (32 + 34 + 26) |
| Thực đơn | 6 danh mục / 30 món, 9 món nổi bật; tất cả `available=true` ở UI |
| Combo | 4 gợi ý cho 2/4/6/8 khách; không phải món seed hoặc chức năng đặt món |
| Ảnh | 36/50 expected assets; thiếu 10 ảnh món và 4 ảnh combo |
| Trang public | 6 trang: Home, Menu, Spaces và 3 trang tầng |

Chi tiết: [không gian và sức chứa](docs/restaurant-world.md),
[menu và giá](docs/menu-canonical.md),
[ảnh và placeholder](docs/asset-integration-status.md).
92 chỗ không phải số chỗ trống hiện tại: chưa có API availability; mỗi booking
chỉ một bàn, tối đa 8 khách và không vượt sức chứa bàn.

Phần 4 chưa triển khai: Supabase Auth, phiên đăng nhập, hồ sơ và authorization.
Có thể bắt đầu khi ảnh còn pending. Trước khi kiểm thử tích hợp, phải xác minh
catalogue thực tế của development, xử lý lệch fixture test trong nhiệm vụ code
riêng và kiểm chứng Auth/JWT thật. Không tự chạy lại seed trên dữ liệu có booking.
