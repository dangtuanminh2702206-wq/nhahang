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
- Business rule nằm trong module nghiệp vụ tương ứng và không phụ thuộc UI.
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
└── architecture.md
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

## Dành cho các giai đoạn sau

- Phần 2: ERD, migration, ràng buộc dữ liệu và seed.
- Phần 3: design system và các trang công khai.
- Phần 4: authentication, hồ sơ và authorization.
- Phần 5–8: booking, Customer, Staff và Admin.
- Phần 9–10: kiểm thử, CI, Vercel và bàn giao.
