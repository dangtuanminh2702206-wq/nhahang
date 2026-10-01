# Kiểm thử Phần 2

## Identity Phần 4 · trạng thái kiểm chứng

Implementation email/password, signup Customer + email confirmation, session,
callback, profile và server authorization đã có. Không đổi database foundation.

| Kiểm tra Auth/JWT thật | Trạng thái |
| --- | --- |
| Signup Customer, trigger profile, metadata giả admin/staff | BLOCKED — cần email sở hữu/tài khoản test development được duyệt |
| Confirmation email, login/logout, persistence/refresh | BLOCKED — chưa có tài khoản đã xác nhận và phiên Auth thật |
| Profile read/update, cấm sửa role/is_active, cross-user | BLOCKED — cần JWT thật của Customer A/B |
| Inactive account | NOT RUN — chưa được phép thay trạng thái account cloud |
| Staff/Admin JWT | NOT RUN — chưa có trusted test account được duyệt |

Ngày 01/10/2026, operator đã cấu hình `.env.local` (được Git ignore). Kiểm tra
chỉ đọc `/auth/v1/settings` xác nhận email provider bật, signup được phép và
email auto-confirm tắt. Không sửa cấu hình cloud hoặc tạo tài khoản test.
Kiểm tra này không chứng minh callback allowlist, email delivery hoặc JWT/RLS.

| Kiểm tra implementation local · 01/10/2026 | Kết quả |
| --- | --- |
| Typecheck, lint | PASS |
| Server build có `.env.local`, Pages build cùng cấu hình | PASS |
| HTTP public/Identity, CSRF, JSON-only, callback cố định, session no-store | PASS |
| Guest `/profile` redirect `/login` | PASS trên bản server cấu hình thật |
| Pages artifact | PASS — 442 local href/src hợp lệ; không chứa URL/key development, form Identity hoặc session endpoint |
| Login/signup và guest profile responsive 320/704/1024/1600px | PASS — không tràn ngang, label hiện hữu |
| Keyboard focus, console login, thông báo lỗi form | PASS — lỗi form chỉ thử với dịch vụ loopback QA, không phải Auth thật |
| Loading/disabled | Đã review implementation; NOT RUN quan sát runtime trạng thái pending bằng phiên Auth thật |

Build lần đầu trong sandbox bị `spawn EPERM` khi tạo tiến trình TypeScript;
chạy lại với quyền thực thi được duyệt đã đạt. Không bỏ qua TypeScript/build.

`pnpm test:identity:smoke` chỉ kiểm tra HTTP local: public/Identity routes, CSRF,
JSON-only mutation, callback không open redirect và session no-store. Phiên QA
UI nếu dùng URL/key giả chỉ trỏ loopback không chứng minh signup/login/JWT.
Không chạy fixture SQL hoặc tạo user cloud trong nhiệm vụ Identity khi chưa có
config/quyền. Kết quả database Phần 2 dưới đây là bằng chứng đã ghi nhận trước,
không được dùng để gán PASS cho integration Auth Phần 4.

Checklist chạy thật khi đủ điều kiện: hai Customer test được duyệt; signup metadata
role giả; xác nhận thư trong cùng browser PKCE; login/reload/refresh/logout; profile
A/B qua JWT; thử cập nhật role/is_active bị grants chặn. Inactive và Staff/Admin
chỉ chạy sau khi operator duyệt account/thao tác cụ thể. Không dùng service-role
cho request người dùng, không nâng quyền/reset/seed để tạo kết quả PASS.

## Kết quả lịch sử Phần 2 · 30/09/2026 (trước đổi catalogue Phần 3A)

Các PASS bên dưới là bằng chứng đã ghi nhận cho catalogue cũ 3 khu vực/16 bàn/
24 món ở Phần 2, không phải lần kiểm thử mới của seed hiện tại. Seed được đổi
sang 3 tầng/22 bàn/30 món ở commit `5e89275`. Kết quả chạy lại và đồng bộ
development được ghi riêng ở mục catalogue mới bên dưới.

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

Kết quả lịch sử: `18 database checks passed`. Lần chạy trước khi có môi trường từng
trả NOT RUN; bảng trên phản ánh lần kiểm chứng Phần 2 đã ghi nhận. Lint/typecheck/build và
HTTP 200 là kiểm tra ứng dụng đã đạt ở commit nền tảng; lần này không sửa UI.

## Kiểm chứng catalogue mới · 30/09/2026

- Đã cập nhật fixture chọn rõ T1-B01/T1-B02/T1-B03/T1-B04, kiểm tra capacity
  2/2/4/4; test vô hiệu hóa đúng area_id của bàn và xác nhận UPDATE tác động 1 dòng.
- Seed chạy hai lần trên PostgreSQL 18.4 local, database mới trống
  `mocvi_test_catalogue_ddc1cf911aea4e2ab6d48c857676312f`: đủ 3 tầng/22 bàn/
  6 danh mục/30 món; từng tầng có 8/8/6 bàn và 32/34/26 chỗ.
- Toàn bộ **18 nhóm kiểm thử database đã đạt với seed hiện tại**, bao gồm RLS,
  chống trùng, idempotency, expiration, rollback và cạnh tranh hai kết nối.
- `supabase/tests/development-smoke.sql` đã cập nhật kỳ vọng 22 bàn/30 món/
  6 danh mục/92 chỗ; chạy PASS trên database local và Supabase development.
- Lint, typecheck, cú pháp script và production build đều PASS.
- SQL Editor project `mocvi-development` (`unhybmmbgumyhzaftlli`) đã được kiểm
  tra chỉ đọc: 3 area cũ (`main/private/window`), 16 bàn `DEMO-*`, 4 danh mục,
  24 món cũ; 0 booking/0 profile; 12 bảng bật RLS, 14 policies, 2 exclusions,
  1 trigger `create_customer_profile`; 7 lịch mở cửa 10:00–22:00.
- Sau xác nhận của người dùng, đã xuất snapshot catalogue cũ ra CSV và kiểm
  tra đọc lại đủ 3 area/16 bàn/4 danh mục/24 món/7 lịch mở cửa. Bản sao lưu local
  ngoài repo: `../mocvi-development-backups/catalogue-before-phase3-seed-20260930.csv`;
  SHA-256 `BB63E6AC0B5DA90434A68FD5BE0EC808B0B5CAC42D3BE44F8873CC8FD25DF5B2`.
- Đã áp dụng seed mới trong transaction, dùng booking advisory lock và khóa
  catalogue; guard từ chối nếu có booking/profile hoặc snapshot đã thay đổi.
  Chỉ thay các mã demo cũ đã xác minh; không reset schema/chạy lại migration,
  không thay grants/RLS, không tạo tài khoản/booking thử trên cloud.
- Smoke SQL mới trả **PASS trên Supabase**: 12 bảng RLS, 2 exclusions, số lượng
  catalogue, quyền anon đọc menu, chặn đọc booking, chặn RPC thiếu identity/quyền,
  chặn nâng role/ghi audit/gọi helper. Đây là SET LOCAL ROLE trong SQL Editor,
  không phải kiểm thử JWT đăng nhập qua HTTP.
- Đọc lại cloud và đối chiếu data public: khớp mã bàn/tầng/capacity của 22 bàn,
  tên/mô tả/danh mục/giá/featured của 30 món; tất cả active/available. Tầng có
  8/8/6 bàn, 32/34/26 chỗ; đủ 6 danh mục. Auth/JWT thật vẫn thuộc Phần 4.

### Đối chiếu hiện tại

| Nguồn | Trạng thái đối chiếu ngày 30/09/2026 |
| --- | --- |
| `src/data/restaurant.ts` và `supabase/seed.sql` | Khớp mã/tầng/capacity của 22 bàn; khớp tên/danh mục/mô tả/giá/featured của 30 món |
| `scripts/test-database.mjs` | Đã cập nhật catalogue, mã fixture và area_id; 18 nhóm PASS trên local trống |
| `supabase/tests/development-smoke.sql` | Đã cập nhật số lượng; PASS local và cloud với catalogue mới |
| Supabase development | Đã sao lưu và thay seed có xác nhận; khớp 3 tầng/22 bàn/92 chỗ/6 danh mục/30 món |
| Auth/JWT thật và scheduler | Chưa kiểm chứng / chưa cài như các giới hạn bên dưới |

Local suite và smoke cloud không chứng nhận Auth/JWT/PostgREST thật. Phần 4 cần
kiểm thử đăng ký/đăng nhập bằng phiên/JWT thật. Không xóa lịch sử để ép khớp.

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

## Các ca đã viết ở Phần 2 (fixture đã cập nhật theo catalogue Phần 3A)

- Áp migration trên database sạch; seed hai lần đúng 3 tầng/22 bàn/30 món,
  6 danh mục và sức chứa 32/34/26 chỗ (kỳ vọng đã cập nhật từ catalogue Phần 2).
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
