# Kiểm thử Phần 2

## Identity Phần 4 · trạng thái kiểm chứng

Implementation email/password, signup Customer + email confirmation, session,
callback, profile và server authorization đã có. Không đổi database foundation.

| Kiểm tra Auth/JWT thật | Trạng thái |
| --- | --- |
| Signup Customer qua form thật | PARTIAL — lần thử đầu bị HTTP 429; lần sau form nhận phản hồi thành công, người dùng báo đã tạo Customer thứ hai và login thật thành công; chưa quan sát callback |
| Phiên đăng nhập Customer thật, đọc profile qua server/RLS | PASS — người dùng đăng nhập; server xác minh Auth user đã confirm email, profile có role customer |
| Trigger tạo profile với metadata signup giả admin | PASS — signup Auth thật với role=admin/is_active=false; owner query thấy metadata admin nhưng profile customer/active=true, email chưa confirm |
| Metadata signup giả staff | BLOCKED — một signup thật trả over_email_send_rate_limit; owner SELECT sau đó không thấy user/profile mới, không retry |
| Email confirmation callback | PARTIAL — user mở thư QA mới rồi báo trang hồ sơ; probe xác minh đúng QA đã confirm/Customer active; chưa quan sát request callback trực tiếp, không gán PASS chỉ từ phiên |
| Cookie phiên sai định dạng | PASS — HTTP với cookie giả lỗi trả authenticated=false; /profile redirect /login; không sửa cookie phiên browser thật |
| Logout và `/profile` sau logout | PASS — logout thật về login; truy cập lại profile tiếp tục redirect login |
| Session persistence khi reload | PASS — reload profile vẫn đọc được hồ sơ bằng phiên thật |
| Refresh JWT khi hết hạn | NOT RUN — reload với phiên hợp lệ không chứng minh token refresh |
| Refresh phiên chủ động bằng SDK | PASS — runner gọi refreshSession cho hai Customer thật; xác minh lại user bằng Auth thành công |
| Profile read/update của chính Customer | PASS — lưu payload hiện tại; đổi full_name tạm, reload thấy giá trị mới, khôi phục tên gốc và reload xác minh; phone giữ nguyên |
| Cấm sửa role/is_active qua JWT thật | PASS — cả hai Customer gửi ghi no-op vào từng cột qua JWT; PostgREST trả 42501; không nâng quyền/khóa tài khoản |
| Cross-user | PASS — hai Customer khác ID đã xác minh bằng Auth; A/B đọc nhau trả 0 dòng, cập nhật nhau trả 0 dòng; đọc lại bằng JWT chủ hồ sơ thấy dữ liệu không đổi |
| Inactive account | PASS — đúng Customer thứ hai: JWT Auth vẫn hợp lệ nhưng RLS ẩn profile, server từ chối lưu và chặn /profile; đã khôi phục active và xác minh truy cập lại |
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

Lần thử signup development đầu tiên ngày 01/10/2026 bị giới hạn gửi email. Không retry
liên tục, không tắt xác nhận email, không tạo/nâng quyền qua Admin API. Chưa có
bằng chứng user test hoặc email xác nhận được tạo thành công tại lần thử đó. Sau
đó Customer thứ hai đã đăng nhập được như mục bổ sung bên dưới. Không lưu email,
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

### Kiểm tra bổ sung · Customer thứ hai · 01/10/2026

Đã đăng nhập Customer thứ hai qua form tại `http://127.0.0.1:3002` và server
hiển thị role customer ở `/profile`. Lưu tên QA tạm, reload thấy tên mới, khôi phục
tên gốc và reload xác minh; không đổi phone. Logout thật và truy cập lại `/profile`
redirect `/login`. Không thấy console error trong phiên kiểm tra. Không lưu danh
tính, mật khẩu hoặc JWT vào báo cáo. Hai tài khoản tồn tại không tự chứng minh
cách ly cross-user; chưa đánh dấu Phần 4 tích hợp hoàn tất.

Runner `node scripts/test-identity-live.mjs` chạy từ repo trong terminal tương tác:
nhập email/mật khẩu của hai Customer development đã confirm (mật khẩu ẩn).
Hoặc `node scripts/test-identity-live.mjs --browser`: form QA riêng ở
`http://127.0.0.1:3004/`, bind loopback, kiểm tra Host/Origin/CSRF, no-store và CSP;
không phải route Next.js và không được deploy/expose ra mạng. Form xóa password
ngay sau submit; không lưu credentials/session. Có thể chạy một Customer, nhưng
runner khi đó ghi rõ cross-user NOT RUN. Dừng QA server sau khi kiểm thử.
Runner chỉ dùng public key của project development được khóa cứng, JWT Customer
thật; không gọi Admin API, không thay role/trạng thái, không tạo booking. Signup
QA riêng chỉ bật khi có mapping email được operator duyệt; không nằm trong runner A/B.
Credentials/session chỉ giữ trong RAM; kết thúc logout riêng các phiên runner.
Nó kiểm tra profile của hai user khác nhau, cập nhật chính mình, cách ly đọc/cập
nhật A/B, chặn ghi cột role/is_active và explicit refresh. Các ghi kiểm thử dùng
giá trị hiện tại (no-op), không nâng quyền/khóa account hay đổi hồ sơ người khác.
Runner đã chạy với credentials thật của hai Customer khác nhau ngày 01/10/2026:
login/getUser/email confirmed, role Customer active, grants role/is_active,
cross-user hai chiều, own profile read/update và explicit refresh đều PASS.
Cập nhật own profile là no-op; đổi tên/khôi phục đã được kiểm tra riêng qua UI.
Kết thúc runner đã logout riêng các phiên test, không đổi phiên browser khác.
Không ghi email, ID, password hay JWT vào báo cáo; không gọi Admin API.
Explicit refresh không chứng minh Proxy xử lý cookie JWT đã hết hạn. Signup
metadata, callback, expired-cookie refresh, inactive và Staff/Admin vẫn riêng.

`node scripts/test-identity-contract.mjs` PASS các contract bằng mock: bỏ qua
user_metadata role, ma trận customer/staff/admin, inactive/missing/foreign profile,
unconfirmed/unconfigured, callback PKCE/OTP, redirect cố định và inactive callback.
Đây không phải JWT thật của Staff/Admin/inactive hay callback email thật; mock
không thay thế các ca cloud. Ca inactive thật được kiểm chứng riêng bên dưới.
Không thay code ứng dụng hoặc dependency.

Gate mới sau bổ sung runner/contract ngày 01/10/2026: syntax hai script, lint,
typecheck, contract mock, HTTP Identity smoke, server build, Pages build và
`git diff --check` PASS. Artifact Pages có 442 href/src local hợp lệ, không có
API availability/bookings export hoặc URL Supabase trong browser chunks.
Không chạy lại responsive toàn bộ vì không thay UI ứng dụng; kết quả UI ở bảng
trên là kiểm chứng đã ghi nhận trước. QA form chỉ phục vụ kiểm thử loopback.

Lần tiếp tục trước khi operator đăng nhập lại ngày 01/10/2026: operator duyệt thử inactive Customer thứ hai và
khôi phục active ngay, không duyệt nâng Staff/Admin. Dashboard ban đầu báo
session expired; mở lại sign-in vào được organization nhưng project/SQL Editor
tiếp tục treo/timeout, chưa đọc được hồ sơ đích. Không chạy UPDATE, không thay
is_active/role và không cần thao tác khôi phục. Không coi lỗi UI quản trị là lỗi
Auth ứng dụng hay bằng chứng database/region outage. Status báo API Gateway
degraded/Eastern US latency, Dashboard/Auth Operational; chưa đủ bằng chứng quy
nguyên nhân project UI vào incident đó. Contract mock và HTTP Identity smoke
chạy lại PASS. Cần mở được project/SQL Editor bằng phiên quản trị hợp lệ trước
khi thử inactive thật.

### Inactive thật và khôi phục · 01/10/2026

Sau khi operator đăng nhập lại, Dashboard/SQL Editor đã truy cập được. Đối chiếu
email được duyệt với auth.users/profiles cho đúng một Customer active đã confirm.
QA probe xác minh phiên hiện có bằng auth.getUser và khớp ID hồ sơ đích; không
lấy token ra chat/log. Phiên đầu không khớp nên không đổi cloud; operator đăng
nhập Customer thứ hai, probe khớp và hồ sơ visible/active/customer.

Owner SQL Editor tạm đổi is_active=false của đúng hồ sơ, kiểm tra guarded theo
ID/email/role/active; không dùng quyền postgres cho request ứng dụng. Phiên thật
vẫn được Auth xác minh nhưng profile invisible qua RLS. Form đang mở gửi lưu bị
server từ chối; reload /profile hiện trạng thái không được truy cập, không render
form hồ sơ. Đã chụp bằng chứng không chứa dữ liệu cá nhân.

Khôi phục đầu tiên lỗi 42601 vì Monaco ghép nội dung editor; chưa đổi được
trạng thái. Đã chọn toàn bộ/xóa editor, kiểm tra lại câu lệnh guarded, chạy lại
và xác minh owner thấy customer/active=true. Probe cùng phiên thấy profile
visible/active/customer, reload /profile truy cập lại được. Không đổi role,
full_name/phone, RLS, migration, Auth settings hoặc tạo booking. updated_at có
thể được trigger cập nhật do chuyển trạng thái; không đặt lùi timestamp.

Runner --browser hỗ trợ IDENTITY_QA_TARGET_ID chỉ giữ trong môi trường tiến
trình (không hardcode ID cá nhân). Nút probe gửi cookie HttpOnly theo HTTP bình
thường tới server QA cùng host loopback, xác minh Auth và query profile bằng JWT
user; chỉ trả authenticated/targetMatches/profileVisible/active/role. Cookie
refresh nếu có được trả với HttpOnly/SameSite; không xuất cookie/JWT/ID hay email.
Probe có Host/Origin/CSRF gate như runner, không thực hiện UPDATE/owner API.
Ca này chứng minh chặn phiên đang đăng nhập; chưa thử login mới lúc inactive.

### Signup metadata thật · đang xác nhận email

Operator đã duyệt hai alias trong hộp thư mình sở hữu để kiểm thử metadata admin
và staff giả. Owner preflight xác nhận cả hai chưa tồn tại. Runner gửi một signup
thật cho ca admin qua public SDK/SSR PKCE, không dùng Admin API; random password
chỉ trong RAM, không log/lưu. Supabase trả user mới có identities, chưa confirm,
không session; owner đọc auth.users/profiles thấy requested_role=admin nhưng
trusted_role=customer, active=true. Đây là PASS cho trigger/metadata admin, không
phải tài khoản Admin thật. Lúc đầu chưa gửi ca staff để tránh ghi đè verifier;
kết quả lần thử tiếp theo ở mục dưới. Không resend/retry tự động hoặc thay email settings.

IDENTITY_QA_SIGNUP_EMAILS là mapping role tấn công tới email operator duyệt trong
môi trường tiến trình, không chứa email cá nhân trong code. Một attempt mỗi role
mỗi lần chạy; không khởi động lại để vượt gate khi chờ confirmation/rate-limit.
Probe confirmed QA so ID user được auth.getUser xác minh với user mới trả từ
signup (giữ RAM), rồi đọc profile qua JWT. Không trả ID/token hoặc đọc thư hộp thư.
Email callback chỉ PASS sau quan sát phiên của user mới và /profile qua flow thật.

### QA đăng ký bằng mật khẩu riêng và giới hạn thư · 01/10/2026

Operator duyệt thêm đúng callback loopback vào allowlist; đã lưu và đọc lại một
URL, không đổi Site URL, provider, template hoặc yêu cầu confirm email. Link QA
cũ đã dùng/hết hạn trả otp_expired; không có mật khẩu ngẫu nhiên để gửi lại. Sau
đó operator duyệt alias QA mới, tự nhập mật khẩu/signup và mở thư trong Codex.
Probe dùng IDENTITY_QA_TARGET_EMAIL từ môi trường, xác minh email của auth.getUser
(không đọc email từ cookie/metadata), confirmed và profile customer/active=true.
Chỉ xuất booleans/role. Phiên QA mới đã đạt; callback end-to-end còn PARTIAL vì
không ghi nhận trực tiếp request exchange, không biến lời báo đăng nhập thành PASS.

Preflight alias staff chưa tồn tại; một signup thật gửi metadata staff/is_active=false
bị over_email_send_rate_limit. Owner SELECT join auth.users/profiles không trả dòng.
Ca metadata staff BLOCKED, không tạo tài khoản thành công, không nâng quyền và không
retry/resend liên tục. Không đòi user biết mật khẩu ngẫu nhiên của ca tấn công.

HTTP cookie lỗi dùng giá trị giả độc lập, không lấy/sửa cookie browser thật: session
unauthenticated và profile redirect login. Không chứng minh refresh JWT thật hết hạn.
Không đánh dấu toàn bộ Phần 4 integration hoàn tất; ca staff/callback cần kiểm chứng
thêm, Staff/Admin thật vẫn NOT RUN theo phạm vi đã duyệt.

Gate cuối sau bổ sung probe/cookie test: syntax script, lint/typecheck, contract
mock, server build, Pages build và 442 references đều PASS. HTTP Identity smoke
PASS sau khởi động lại server, gồm session cookie lỗi và không render profile form.
Next.js streaming redirect có thể trả HTTP 200 với meta refresh về login; test
chấp nhận đúng semantic redirect này hoặc HTTP 307, không chỉ chấp nhận status 200.
Reload hồ sơ QA mới sau build giữ Customer; console không có error trong ca đó.
Không chạy lại toàn bộ responsive vì không đổi UI; dùng bằng chứng trước đã ghi.

Build sandbox đầu tiên gặp spawn EPERM; chạy với quyền thực thi được duyệt đạt.
Không chạy song song hai mode: Next.js dùng chung đầu ra .next nội bộ trước khi
export Pages, từng gây lỗi server tạm thời thiếu middleware-manifest. Đã build
Pages/kiểm tra artifact trước, build lại normal, khởi động server 3002 và smoke PASS.
Đã dừng QA server riêng sau test; server ứng dụng vẫn chạy local. Không đổi workflow.

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
