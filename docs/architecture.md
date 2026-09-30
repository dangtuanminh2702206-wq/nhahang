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
│   └── page.tsx
└── config/
    └── site.ts

docs/
├── architecture.md
├── database.md
└── database-testing.md

supabase/
├── migrations/
│   └── 202609300001_foundation.sql
└── seed.sql

scripts/
└── test-database.mjs
```

Các thư mục `components`, `features`, `lib` và `types` chỉ được tạo khi giai đoạn
sau có file sử dụng thực tế.

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
trong [database.md](database.md). PostgreSQL local/Supabase chưa được cấu hình;
không coi việc build Next.js thành công là bằng chứng SQL/RLS hoạt động.

## Dành cho các giai đoạn sau

- Việc kiểm chứng còn lại của Phần 2: chạy migration/seed/tests trên PostgreSQL
  sạch, sau đó kiểm thử JWT/Auth/RLS trên Supabase development.
- Phần 3: design system và các trang công khai.
- Phần 4: authentication, hồ sơ và authorization.
- Phần 5–8: booking, Customer, Staff và Admin.
- Phần 9–10: kiểm thử, CI, Vercel và bàn giao.
