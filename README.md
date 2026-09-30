# Mộc Vị Restaurant

Website quản lý và đặt bàn trực tuyến cho một nhà hàng, được phát triển trong
đồ án môn Kỹ thuật phần mềm ứng dụng. Phiên bản hiện tại mới hoàn thành nền móng
kỹ thuật; các module nghiệp vụ sẽ được triển khai theo từng giai đoạn.

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

## Trạng thái hiện tại

Phần 1 đã thiết lập Next.js, TypeScript, Tailwind CSS, ESLint, metadata, trang
xác nhận tối thiểu và tài liệu nền móng.

Phần 2 bổ sung schema 12 bảng, constraints/indexes/RLS, hàm tạo và xác nhận
booking, hết hạn pending, seed demo và bộ kiểm thử tích hợp. Lint, typecheck và
build đã qua. Migration/seed đã chạy trên Supabase development và PostgreSQL
local; **18 nhóm kiểm thử database local và smoke test quyền Supabase đều đạt**.
Chưa triển khai authentication flow, API ứng dụng, giao diện booking/vận hành
hoặc scheduler. Kiểm thử Auth/JWT qua API sẽ thực hiện khi tích hợp authentication.

- [ERD, data dictionary, policy, quyền và migration/seed](docs/database.md)
- [Kiểm thử database và giới hạn kiểm chứng](docs/database-testing.md)
