# Kiểm thử Phần 2

## Identity Phần 4 · trạng thái kiểm chứng

Implementation email/password, signup Customer + email confirmation, session,
callback, profile và server authorization đã có. Không đổi database foundation.

| Kiểm tra Auth/JWT thật | Trạng thái |
| --- | --- |
| Signup Customer qua form thật | BLOCKED — đã gửi request với email được duyệt; Supabase trả `over_email_send_rate_limit` / HTTP 429 |
| Phiên đăng nhập Customer thật, đọc profile qua server/RLS | PASS — người dùng đăng nhập; server xác minh Auth user đã confirm email, profile có role customer |
| Trigger tạo profile trong signup mới, metadata giả admin/staff | NOT RUN — chưa có signup test mới thành công để quan sát trigger/attack |
| Email confirmation callback | NOT RUN — chưa quan sát callback thành công; không dùng việc account đã confirm để gán PASS cho flow |
| Logout và `/profile` sau logout | PASS — logout thật về login; truy cập lại profile tiếp tục redirect login |
| Session persistence khi reload | PASS — reload profile vẫn đọc được hồ sơ bằng phiên thật |
| Refresh JWT khi hết hạn | NOT RUN — reload với phiên hợp lệ không chứng minh token refresh |
| Profile read/update của chính Customer | PASS — lưu payload hiện tại; đổi full_name tạm, reload thấy giá trị mới, khôi phục tên gốc và reload xác minh; phone giữ nguyên |
| Cấm sửa role/is_active qua JWT thật | NOT RUN — đã review whitelist/grants; chưa gửi request tấn công bằng JWT thật |
| Cross-user | BLOCKED — chưa có phiên Customer thứ hai được duyệt |
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
| Loading/disabled | PASS — quan sát fields/button disabled và “Đang xử lý…” trong request signup thật; được bật lại sau lỗi 429 |

Lần thử signup development ngày 01/10/2026 bị giới hạn gửi email. Không retry
liên tục, không tắt xác nhận email, không tạo/nâng quyền qua Admin API. Chưa có
bằng chứng user test hoặc email xác nhận được tạo thành công. Không lưu email,
mật khẩu, token hoặc liên kết xác nhận trong tài liệu. Sau đó người dùng đăng nhập
tài khoản Customer hiện có trong browser kiểm thử. Phiên thật, lưu hồ sơ/reload và
logout đã được kiểm chứng như bảng trên; không ghi email/tên/phone/ID cá nhân.
Route session phân loại lỗi rate-limit (429), SMTP không cho phép địa chỉ (503)
và lỗi dịch vụ/kết nối (503); các lỗi credentials vẫn dùng thông báo chung.
Chẩn đoán server chỉ ghi action/code/status, không ghi payload/provider message.
Sáu ca phân loại lỗi (rate-limit, SMTP, network, server, credentials, signup
validation) đã chạy và PASS; chỉ xác nhận xử lý lỗi, không thay thế Auth/JWT.

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

## Phần 5 · kiểm chứng local · 01/10/2026

| Nhóm | Bằng chứng / giới hạn |
| --- | --- |
| Database | PASS 23 nhóm trên PostgreSQL 18.4, database mới trống `mocvi_test_phase5_20261001`, loopback 55439 |
| Migration | Foundation + `202610010001_availability.sql` áp theo thứ tự; seed 2 lần; 3 tầng/22 bàn/92 chỗ/30 món giữ nguyên |
| Availability SQL | PASS Guest projection 4 trường, capacity, inactive table/area, out_of_service, occupied tương lai, opening/closing buffer, notice/advance hai phía, ngày nghỉ, pending hết hạn read-only |
| Booking SQL | PASS ownership/RLS/Guest denial, idempotency, race cùng bàn/Customer limit, rollback; snapshot lookup cũ không vượt exclusion |
| Handler unit | PASS validation, cờ mặc định tắt và từ chối cloud cả khi true, whitelist, mock Guest/active-role denial, retry key/RPC source, lỗi conflict và public projection; **mock không chứng minh JWT** |
| HTTP server local | PASS cờ tắt 503, CSRF 403, availability input 400/no-store; không tạo booking cloud |
| Identity regression | PASS HTTP public/Identity, CSRF, callback không open redirect, Guest no-store; không phải Auth integration |
| Build | PASS typecheck, lint, Next.js server và Pages `/nhahang`; diff whitespace sạch |
| Static artifact | PASS 442 liên kết/asset references, không export API booking/availability, không có cloud project URL trong browser chunks |
| Browser | PASS 320/704/1024/1600 không overflow, native labels, focusable errors, loading/disabled, chọn tầng/bàn đồng bộ, service unavailable không báo bàn trống, demo Pages xác nhận mô phỏng; không thấy console error/warn trong các ca này |
| JWT → RPC → booking endpoint | NOT RUN: chưa có Supabase Auth/PostgREST local cô lập; máy không có Docker/Supabase CLI sẵn. Không cài mới hoặc thay config cloud để ép test |
| UI live empty/conflict/success | NOT RUN toàn tuyến; handler/SQL đã test các lớp, chưa có backend local Auth thật để xác minh UI happy path |
| Cloud | Migration mới **chưa áp**, booking mutation **chưa bật**, không seed/reset/đổi RLS/grants/role/SMTP/scheduler cloud |

Kiểm thử bổ sung không thay thế các ca Phần 4 signup/callback/refresh JWT,
cross-user/inactive/Staff/Admin thật còn thiếu. Không đánh dấu Phần 4/5 tích hợp
hoàn tất. Trước khi kích hoạt cloud cần hoàn thiện kiểm chứng Auth, môi trường
Supabase local (Auth + PostgREST), chạy toàn tuyến, người dùng duyệt migration
development và kế hoạch vận hành/expiration. Cờ hiện tại cố ý không thể bật cloud.

`BOOKING_LOCAL_MUTATIONS_ENABLED=true` chỉ dùng với public URL/key của Supabase
**local cô lập**; không thay `.env.local` development để chạy fixture PostgreSQL.
Fixture SET ROLE chỉ dành cho `pnpm test:db`. Test runner vẫn từ chối database
không trống/non-loopback và không xóa database sau test.

Chạy `pnpm test:booking`; tùy chọn `BOOKING_TEST_BASE_URL=http://127.0.0.1:3002`
để thêm HTTP cờ tắt, `BOOKING_CHECK_PAGES=true` để kiểm tra artifact `.next-pages`
sau export. Chỉ bật các tùy chọn khi đúng môi trường, không dùng URL cloud.
