# Kiểm thử Phần 2

## Kết quả kiểm chứng ngày 30/09/2026

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `node --check scripts/test-database.mjs` | PASS — chỉ cú pháp JavaScript |
| `pnpm build` | PASS — Next.js tạo production build |
| Khởi động production tại localhost:3100 | PASS — ready, trang chủ HTTP 200 và có tên Mộc Vị |
| `node scripts/test-database.mjs` (script của `pnpm test:db`) | PASS — 18 nhóm kiểm thử trên PostgreSQL 18.4 local |
| Migration database sạch / seed hai lần | PASS — cả PostgreSQL local và Supabase development |
| Test RLS, cạnh tranh, expiration, rollback | PASS — suite local dùng role thực và hai kết nối cạnh tranh |
| Supabase schema/seed | PASS — 12 bảng bật RLS, 14 policies, 2 exclusion constraints; 3 khu vực/16 bàn/24 món |
| `supabase/tests/development-smoke.sql` | PASS trên Supabase — quyền anon/authenticated và yêu cầu danh tính của RPC |
| Supabase Auth/JWT/PostgREST | Chưa kiểm thử đăng nhập/JWT qua API; SQL Editor không thay thế kiểm thử này |
| Scheduler expiration | Chưa cài; có hướng dẫn trong database.md |

Supabase project `mocvi-development` đã được kiểm tra trống trước khi chạy
migration qua SQL Editor. Seed chạy hai lần không nhân đôi. Smoke test dùng
`SET LOCAL ROLE` thực, kết thúc bằng ROLLBACK, không tạo tài khoản hoặc booking
thử trên cloud. File smoke test có thể chạy lại sau seed trên development.

Suite đầy đủ chạy riêng trên PostgreSQL 18.4 portable, binary từ npm package
`@embedded-postgres/windows-x64@18.4.0-beta.17`, trong thư mục tạm ngoài repo.
Server chỉ lắng nghe `127.0.0.1:55439`, database tên `mocvi_test_phase2`, đã dừng
sau khi hoàn thành. Không cài Windows service, không thêm dependency vào project.
Runtime/package portable này phục vụ kiểm thử, không phải cấu hình production.

Kết quả cuối: `18 database checks passed`. Lần chạy trước khi có môi trường từng
trả NOT RUN; bảng trên phản ánh lần kiểm chứng mới nhất. Lint/typecheck/build và
HTTP 200 là kiểm tra ứng dụng đã đạt ở commit nền tảng; lần này không sửa UI.

## Chạy bộ kiểm thử local

Yêu cầu PostgreSQL 15+ có `btree_gist`, Node/pnpm của project và một **cluster
local dùng để kiểm thử**, không dùng database có dữ liệu cần giữ. Tài khoản chạy
fixture cần quyền tạo roles/schema/extension và SET ROLE (thông thường là owner
quản trị của cluster local). Không tạo Supabase cloud account cho bộ test này.

1. Tạo database **mới, trống** tên `mocvi_test_phase2` trên loopback.
2. Export `TEST_DATABASE_URL` trong shell từ nguồn secret local. Ví dụ cấu trúc
   URL: `postgresql://<test-user>:<local-password>@127.0.0.1:5432/mocvi_test_phase2`.
   Không commit mật khẩu hoặc connection string thật. Script không tải file env.
3. Chạy `pnpm test:db`. Mỗi ca thành công in `PASS`; chỉ dòng tổng kết cuối cùng
   mới xác nhận toàn bộ suite hoàn thành.
4. Nếu chạy lại, tạo database trống khác có prefix `mocvi_test_`. Script không
   reset database có sẵn, không tự xóa database sau test.

Chỉ URL protocol postgres/postgresql, host localhost/127.0.0.1/::1 và tên database
đúng prefix được chấp nhận. Không cho URL query override địa chỉ kết nối. Trước
khi tạo fixture, script từ chối schema `auth` có sẵn hoặc bảng trong `public`.
Script không in URL, password hoặc token.

**Tác động fixture:** tạo roles cluster-wide `anon`/`authenticated` nếu chưa có,
schema `auth` tối thiểu, auth.users chỉ có UUID và auth.uid đọc session claim.
Test dùng UUID ngẫu nhiên, không có email/mật khẩu hoặc tài khoản cloud. Bên
trong database test, script TRUNCATE các bảng booking/history/notification/audit
giữa các ca để cô lập kết quả. Roles đã tạo và database test vẫn còn sau khi
chạy; chỉ quản trị viên môi trường test mới nên dọn khi không còn sử dụng.

`pg` là devDependency duy nhất thêm cho testing. Dùng `node:assert` có sẵn;
không cần framework test/ORM. `pg` cung cấp các kết nối độc lập và query tham số
mà stack frontend hiện tại chưa có.

## Các ca đã viết

- Áp migration trên database sạch; seed hai lần vẫn đúng 3 khu vực/16 bàn/24 món.
- Retry đúng payload trả cùng ID; đổi payload với cùng key bị từ chối.
- Trùng bàn bị chặn; bắt đầu đúng cuối buffer được chấp nhận.
- Bắt đầu đúng giờ mở/kết thúc buffer đúng giờ đóng; vượt biên bị chặn.
- Customer dùng bàn khác ngay tại cuối service period của booking trước.
- Min notice, max advance, sức chứa, ngày nghỉ, ngoài giờ.
- Customer không đọc booking/history/notification của người khác; không sửa
  role, ghi audit hoặc gọi helper private. Guest không đọc dữ liệu booking và
  không tạo booking, nhưng đọc được menu công khai.
- Customer sửa tên mình được nhưng không sửa tên người khác. Chỉ Admin đọc audit.
- Staff tạo phone booking không account ở confirmed; Customer không giả nguồn
  Staff hoặc giả customer_id của người khác.
- Confirm hợp lệ và retry confirm chỉ ghi một sự kiện chuyển trạng thái.
- Confirm sau expiry trả cancelled/system/pending_expired; giải phóng lịch.
- Expiration chạy lại không trùng lịch sử, không tự đổi bàn occupied về available.
- Out-of-service hoặc khu vực không hoạt động chặn booking mới.
- Hai session cùng bàn: đúng một thành công, một lỗi exclusion 23P01.
- Hai session cùng Customer đặt hai bàn trùng service: đúng một thành công.
- Hai session tranh slot thứ ba của Customer: đúng một thành công.
- Retry cùng key đồng thời: một booking, một sự kiện.
- Lỗi cố ý khi insert history: booking/history/notification/audit đều rollback.
- Khóa tài khoản chặn tạo booking mới, không tự hủy booking đang có.

Các ca cạnh tranh giữ advisory lock bằng connection thứ ba, kiểm tra cả hai
session đã thực sự chờ lock trong `pg_stat_activity` rồi mới nhả. Không giả lập
cạnh tranh bằng hai lệnh chạy tuần tự. Query nghiệp vụ thực hiện bằng SET LOCAL
ROLE anon/authenticated và claim từng identity; chỉ setup/assertion nội bộ dùng
owner. Fixture từ chối roles có SUPERUSER/BYPASSRLS.

## Phần cần kiểm chứng thêm khi có môi trường

1. Suite local và smoke test development đã đạt. Chạy lại khi thay đổi schema
   hoặc business rule; luôn dùng database local trống cho suite đầy đủ.
2. Khi triển khai authentication: đăng ký tài khoản test qua Auth thật trên
   development và xác minh trigger luôn tạo Customer kể cả metadata giả role.
3. Gọi RPC với JWT Guest/Customer/Staff/Admin thật; kiểm tra schema private không
   exposed, RLS/grants và principal service_role không xuất hiện ở client.
4. Cấu hình cron expiration mỗi phút; thử giữ pending qua deadline, xem lịch sử
   và job failure. Retry cùng key phải trả booking đã cancelled, không hồi sinh.
5. Kiểm tra walk-in trong giờ mở cửa với bàn sẵn sàng, và từ chối khi occupied/
   cleaning. Chưa có ca happy-path walk-in độc lập thời gian hệ thống trong suite.
6. Kiểm thử các mốc bằng chính xác 60 phút/30 ngày/30 phút expiration bằng đồng
   hồ được kiểm soát ở môi trường test. Suite hiện kiểm tra hai phía min/max và
   các biên giờ phục vụ/khoảng lịch; không tuyên bố đã test mọi mốc bằng thời gian.

Các thao tác cancel/check-in/complete/no-show/đổi bàn chưa được triển khai nên
chưa có kiểm thử mutation tương ứng. Giai đoạn sau phải bổ sung vào cùng cơ chế
khóa, authorization và transaction history; không cập nhật bảng trực tiếp từ UI.
