# Mộc Vị Restaurant

Website quản lý và đặt bàn trực tuyến cho một nhà hàng, được phát triển trong
đồ án môn Kỹ thuật phần mềm ứng dụng. Bản Vercel hiện có public UI, Identity,
booking, Customer, Staff, Admin và đặt món/combo. Nhật ký cũ được tách khỏi
hướng dẫn hiện hành. Trạng thái mở rộng được theo dõi tại
[completion-backlog.md](docs/completion-backlog.md).

Nhóm mở rộng combo đã có code/migration, đã bật live sau rollout database và đã
nghiệm thu Admin create/update/hide trên production trong phạm vi QA. Bốn combo
canonical vẫn được bảo toàn; combo QA được archive/inactive sau kiểm thử. Công cụ
backup mã hóa/restore local được mô tả ở [operations-runbook.md](docs/operations-runbook.md);
đã có backup production mã hóa và kiểm chứng archive, nhưng chưa nghiệm thu
restore cô lập, off-site/key recovery hoặc disaster recovery. Đây là giới hạn
vận hành được ghi nhận, không phải tính năng bắt buộc của phạm vi môn học đã chốt.

## Phạm vi sản phẩm

Hệ thống phục vụ bốn vai trò: Guest, Customer, Staff và Admin. Luồng
nghiệp vụ chính đi từ tìm bàn, tạo booking, xác nhận, nhận khách đến hoàn thành
lượt phục vụ. Customer đặt món lẻ/combo theo booking đã xác nhận hoặc check-in;
Staff xử lý đơn, server lưu snapshot và tính tổng dự kiến. Thanh toán trực tiếp
tại quầy. Thanh toán online, hóa đơn điện tử, kho, nhiều chi nhánh và báo cáo
tài chính chuyên sâu nằm ngoài phạm vi đồ án.

Trạng thái hiện hành và bộ bàn giao môn học: [academic-handover.md](docs/academic-handover.md).
Baseline: 3 tầng, 22 bàn, 92 chỗ cấu hình, 30 món, 4 combo, 50 ảnh canonical.
Combo CRUD và đặt món đã bật/kiểm thử production. Recovery email và rotation QA
đã được operator xác nhận; luồng Customer A/B → booking → order → Staff đạt qua
HTTP và SQL read-back. Các kết quả browser được ghi riêng, không suy từ API.

Ba sơ đồ bàn PNG theo tầng được thêm ngoài bộ 50 ảnh WebP canonical. Người dùng
có thể chọn hotspot; mã bàn và sức chứa vẫn lấy từ catalogue, không suy từ ảnh.
Liên kết bàn mở form với tầng/bàn được chọn sẵn; chỉ bước kiểm tra khả dụng/gửi
yêu cầu mới gọi nghiệp vụ. Pages vẫn là demo tĩnh và không tạo booking.

## Admin xóa lịch sử đặt bàn

Trong `/admin` → **Lịch sử đặt bàn**, chọn khoảng ngày báo cáo, chọn từng booking,
nhập nguyên mã booking và lý do rồi xác nhận. Xóa vĩnh viễn cả đơn món, chi tiết,
lịch sử và thông báo liên quan; không có hoàn tác trên website. Audit và retry
receipts được giữ. Server chỉ cho Admin active xóa booking terminal đã qua giờ
kết thúc, không còn đơn món đang xử lý; snapshot cũ bị từ chối.

Migration `202610040001_admin_booking_deletion.sql` đã áp production ngày
04/10/2026 sau khi operator duyệt; RPC/grants được đối chiếu đúng source.
Không có dữ liệu production nào được xóa trong nhiệm vụ triển khai này.

## Tech stack

- Next.js App Router
- TypeScript strict
- Tailwind CSS
- ESLint với cấu hình Core Web Vitals và TypeScript
- Supabase PostgreSQL và Auth; ảnh hiện dùng asset local, không cần Storage upload
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

`.env.example` mô tả các biến cấu hình. Không commit `.env.local` hoặc bất kỳ
khóa bí mật nào. Vercel production đã chạy Supabase Auth/database và combo/order;
local phải cấu hình đúng project theo mục đích kiểm thử. Resend chưa tích hợp.

## Kiến trúc

Quyết định kiến trúc và cấu trúc module hiện hành được ghi tại
[`docs/architecture.md`](docs/architecture.md).

## Bản xem thử trên GitHub Pages

Workflow `.github/workflows/pages.yml` xuất bản giao diện public từ nhánh
`codex/restaurant-booking-platform`. Repository cần bật Settings → Pages →
Source: GitHub Actions. Website demo public:
[Mở Mộc Vị Restaurant](https://dangtuanminh2702206-wq.github.io/nhahang/).

Đây chỉ là bản demo giao diện: chưa đăng nhập, đặt bàn hoặc vận hành nhà hàng.
Chế độ export được bật riêng bằng `GITHUB_PAGES=true`, dùng prefix `/nhahang`,
thư mục xuất `.next-pages`
và ảnh WebP gốc. Build thông thường/local/Vercel vẫn giữ chế độ Next.js server
và tối ưu ảnh mặc định. Không đưa biến bí mật hoặc kết nối database vào Pages.

## Tài liệu bàn giao và nghiệm thu

- [Bộ bàn giao môn học: use case, ERD, test matrix, demo và minh chứng](docs/academic-handover.md)
- [Hướng dẫn sử dụng hiện hành](docs/user-guide.md)
- [Kiến trúc hiện hành](docs/architecture.md)
- [Schema, data dictionary và policy](docs/database.md)
- [Kết quả kiểm thử theo môi trường và loại bằng chứng](docs/database-testing.md)
- [Baseline không gian/bàn](docs/restaurant-world.md), [món/combo](docs/menu-canonical.md), [asset](docs/asset-integration-status.md)
- [Nhật ký kiến trúc/triển khai theo thời điểm](docs/architecture-history.md)

Bộ CI chạy contract/regression, SQL integration trên PostgreSQL cô lập, typecheck,
lint, normal build, HTTP smoke, Pages export và Chrome headless smoke cho form
hydrate/query/hotspot tại các breakpoint. 86 nhóm SQL gần nhất đạt; số lượng
và bằng chứng production/browser mới nhất ghi trong tài liệu testing. Không dùng
kết quả build để chứng nhận quyền RLS/JWT. Nhóm bổ sung thông tin lớp, thành viên
và phân công theo mẫu giảng viên trước khi nộp.

Diễn tập browser ngày 04/10 đã đạt tạo/xác nhận booking, gửi/sửa đơn món+combo,
Staff xử lý tới served và cleanup. Check-in/complete/dọn bàn đạt trên walk-in QA
riêng trong giờ phục vụ; kịch bản demo một booking liên tục cần chuẩn bị đúng giờ.

Backlog mở rộng thương mại được giữ tại completion-backlog.md để tham khảo,
không phải danh sách tính năng bắt buộc của đồ án đã chốt.
