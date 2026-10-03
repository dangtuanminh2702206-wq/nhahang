# Kiểm thử Phần 2

## Trạng thái hiện tại

- **Phần 4 — PASS trong phạm vi Identity/Auth đã thống nhất.** Bằng chứng gồm
  callback email và metadata giả trên local, JWT hết hạn tự nhiên qua Proxy
  Production ở session 16686, A/B, inactive, Staff/Admin và các hồi quy. Các
  mục lịch sử `PARTIAL`, `RUNNING` bên dưới không phải trạng thái hiện tại.
- **Phần 5 — PASS trong phạm vi Customer booking đã thống nhất.** Các ca
  Customer/Staff/Admin, availability, booking, transaction, idempotency, RLS,
  audit, UI, build và deployment đã PASS. Runner hai Customer thật trên Production
  ngày 02/10/2026 trả COMPLETE: đúng một pending/một 409 khi tranh bàn, cách ly
  đọc booking/history/notification hai chiều, retry không tạo trùng, chặn giả mạo
  customer/source và Guest không đọc booking. Hai booking test được giữ lại;
  phiên test đã logout. Chi tiết ở [booking-production.md](booking-production.md).
- Callback email được chứng minh ở local; không mở rộng kết luận đó thành
  callback Production. Reset password, dashboard và workflow Staff/Admin nằm
  ngoài phạm vi nghiệm thu này.

## Identity Phần 4 · trạng thái kiểm chứng

### Nghiệm thu tiếp tục · 02/10/2026, 10:27 Asia/Saigon

- Preflight SELECT đúng alias QA đã duyệt: Auth user = 0, profile = 0. Một
  signup mới được chấp nhận sau khi operator tự nhập mật khẩu; không resend,
  không đổi SMTP/confirmation/expiry/RLS hoặc tạo alias thay thế.
- **Callback email end-to-end: PASS local**. Observer loopback giữ PKCE verifier
  trong RAM; operator cung cấp link từ thư trực tiếp vào công cụ, không qua chat.
  Supabase verify redirect về callback ứng dụng local; callback thật trả 307
  `/profile`, Auth cookies HttpOnly/SameSite=Lax, no-store/no-referrer. Auth xác
  minh đúng user mới confirmed; `/profile` và `/auth/session` chấp nhận phiên
  callback mà không đăng nhập bằng mật khẩu; logout test-session trở lại Guest.
- **Signup metadata staff giả: PASS**. Request Auth thật gửi `role=staff` và
  `is_active=false`; sau confirmation, JWT chính QA đọc trusted profile trả
  `role=customer`, `is_active=true`. Không cấp Staff hoặc đổi trạng thái user.
- **JWT hết hạn tự nhiên: RUNNING, chưa PASS**. Tiến trình cũ không còn truy
  cập được, không suy ra PASS. Runner mới đã đăng nhập đúng Staff test được
  duyệt; Auth xác minh confirmed, trusted profile Staff active. Auto-refresh
  tắt; cookie/JWT chỉ trong RAM, giữ nguyên đến expiry. Mốc kiểm tra thực tế
  sau expiry: **11:29:46 ngày 02/10/2026 Asia/Saigon**, qua Proxy Production.
  Đã cập nhật lượt theo dõi một lần vào 11:30; chỉ kết quả thật sau expiry mới
  được dùng chốt nghiệm thu, không coi việc bắt đầu/chờ là bằng chứng PASS.
- Hồi quy hiện tại: typecheck, lint, identity contract và HTTP smoke local PASS.
  Normal build PASS sau khi chạy ngoài giới hạn sandbox: lần đầu compiled nhưng
  worker TypeScript bị `spawn EPERM`; lần chạy lại kết thúc exit 0.
- Không đổi runtime ứng dụng; không commit/push/deploy. Harness ở ngoài repo;
  không ghi email, ID, password, confirmation link, token hoặc cookie vào tài liệu.

Phần 4 còn PARTIAL **chỉ do gate expired-JWT Proxy refresh chưa có kết quả**.
Callback ở trên được chứng minh local, không gán PASS callback Production.
Các trạng thái email BLOCKED và Staff/Admin NOT RUN bên dưới là lịch sử, không
thay thế bằng chứng mới hoặc được dùng để phủ nhận kết quả hiện tại.

### Tiếp tục nghiệm thu · 02/10/2026

- Typecheck, lint, normal build, identity contract và HTTP identity smoke: PASS
  khi chạy lại. Kiểm tra guest/CSRF/callback cố định trên Production: PASS;
  các ca này không thay thế kiểm thử Auth/JWT thật.
- Signup alias QA đã duyệt bị `over_email_send_rate_limit`; SELECT đúng alias
  sau lỗi xác nhận không có Auth user hoặc profile mới. Không retry/resend.
  Operator yêu cầu dừng phần email; callback email end-to-end và metadata
  staff giả chưa được chứng minh, không gán PASS.
- Kiểm thử JWT Staff có chữ ký thật đang chờ hết hạn tự nhiên để kiểm tra
  Proxy refresh trên Production, dự kiến 00:54:38 ngày 02/10 theo Asia/Saigon.
  Chưa có kết quả: không coi việc khởi chạy là PASS. Không rút ngắn expiry,
  không sửa token và không dùng refresh chủ động thay thế ca này.
- Đã dừng harness email loopback; tiến trình JWT riêng vẫn chạy. Công cụ tạm
  nằm ngoài repo; không đưa credential/token hoặc công cụ đó lên Git.
- Không đổi runtime, Auth config, RLS hoặc booking; không commit/push/deploy.

Phần 4 vẫn PARTIAL. Kiểm tra kết quả JWT một lần sau mốc hết hạn không tự
khởi động lại phần email đã được operator yêu cầu dừng.

### Staff/Admin JWT thật · 01/10/2026

Operator đã đăng ký/xác nhận hai tài khoản test chuyên dụng, sau đó duyệt
riêng việc cấp Staff/Admin trên Supabase hiện tại. Đã SELECT đối chiếu đúng
ID/email, confirmed và Customer active trước khi đổi role. Giao dịch UPDATE
chỉ chấp nhận đúng hai tài khoản đã duyệt còn là Customer active, kiểm tra
row count = 2; không đổi RLS, grants, schema, tài khoản khác hoặc booking.
Không ghi email, ID, mật khẩu hoặc JWT của tài khoản test vào repo.

| Kiểm tra thực tế | Kết quả |
| --- | --- |
| Staff/Admin đăng nhập trên Vercel, profile server đọc role tin cậy | PASS — UI hiển thị staff/admin; không lấy role từ metadata |
| Auth getUser, confirmed email, profile active qua JWT thật | PASS cho cả hai tài khoản |
| JWT Staff/Admin sửa cột role/is_active | PASS — ghi no-op bị từ chối 42501 |
| Staff đọc hồ sơ Admin test có ID đã biết | PASS — 0 dòng |
| Admin đọc hồ sơ Staff test có ID đã biết | PASS — 1 dòng, không truy vấn danh sách hồ sơ người dùng |
| Admin cập nhật hồ sơ Staff test | PASS — 0 dòng theo RLS hiện có |
| Đăng xuất các phiên SDK dùng kiểm thử | PASS — local scope |

Đây là bằng chứng bổ sung cho gate Staff/Admin JWT, không thay thế gate
callback email end-to-end, signup metadata staff giả và JWT hết hạn tự nhiên
qua Proxy. Các mục còn thiếu ở những baseline lịch sử dưới đây giữ nguyên
để đối chiếu; mục Staff/Admin NOT RUN lịch sử đã được bổ sung bằng kết quả này.
Phần 4 vẫn PARTIAL, không bật booking hoặc tạo dashboard vận hành.

### Kiểm tra sau khi chuyển sang Vercel · 01/10/2026 · trước cấp role test

Production: `https://moc-vi-restaurant.vercel.app`, source branch
`codex/restaurant-booking-platform`, commit runtime `fd8ef0e`.

- Typecheck, lint và `test-identity-contract.mjs`: PASS khi chạy lại.
- Normal production build: PASS sau chạy lại ngoài sandbox; lần đầu bị
  `spawn EPERM` ở bước tạo tiến trình TypeScript, không phải lỗi TypeScript.
- `test:identity:smoke`: PASS trên local 3002, gồm cookie sai định dạng,
  CSRF, JSON-only, callback cố định và guest no-store.
- HTTP Production: PASS từ chối origin ngoài và form POST (403), callback
  không chấp nhận `next` ngoài domain, guest session có no-store và không
  authenticated. Đây là kiểm tra không có phiên, không phải nghiệm thu JWT thật.
- Site URL và exact callback HTTPS đã cấu hình trên Supabase; callback local
  vẫn giữ. Cấu hình allowlist không chứng minh email callback end-to-end.
- Chưa có hai tài khoản test được cấp trusted Staff/Admin. Không nâng quyền
  các Customer hiện có hay các alias dùng kiểm thử metadata giả.

Chuẩn bị nghiệm thu còn lại:

1. Operator đăng ký hai tài khoản chuyên dụng và xác nhận email trong cùng
   trình duyệt dùng đăng ký; tự nhập/giữ mật khẩu, không đưa vào Git hoặc log.
2. Xác minh đúng Auth user và profile Customer của từng tài khoản trước khi
   đề nghị operator cấp riêng role Staff/Admin cho đúng hai user test.
   Không đổi grant/RLS, không lấy user metadata làm nguồn quyền.
3. Chạy kiểm tra role bằng JWT thật. Alias signup metadata giả `staff` phải
   được kiểm thử riêng và vẫn giữ Customer, không dùng nó làm Staff test.
4. Quan sát callback email thực tế; kiểm tra JWT hết hạn tự nhiên qua Proxy,
   cookie refresh và phiên sau refresh. SDK refresh chủ động hay JWT sửa
   payload không thay thế ca JWT thật hết hạn.

Phần 4 vẫn PARTIAL cho tới khi các gate integration còn thiếu được chứng minh.
Không bật booking, không tắt email confirmation hoặc rút ngắn expiry cloud để
đổi lấy kết quả kiểm thử.

### Tiếp tục nghiệm thu · sau commit Phần 3 `4709528`

Implementation Phần 4 đã được đưa lên GitHub trước nhiệm vụ này, nhưng chưa đủ
bằng chứng để công bố toàn bộ Auth integration PASS. Không đánh dấu hoàn tất chỉ
vì UI đăng nhập hoặc bộ kiểm thử mock chạy được.

- Chạy lại `node scripts/test-identity-contract.mjs`: PASS identity/role matrix,
  callback và các contract Proxy mới. Proxy được kiểm tra trực tiếp từ module
  ứng dụng với cookie giả: truyền cookie refresh tới request/response, xóa chunk
  cũ, giữ header SDK/no-store, không tạo phiên khi provider lỗi hoặc chưa cấu hình.
- `pnpm test:identity:smoke`: PASS HTTP, CSRF, callback cố định, cookie sai định
  dạng và guest no-store trên server local 3002. Không dùng phiên browser thật.
- Typecheck/lint và `git diff --check`: PASS. Chỉ bổ sung test/tài liệu, không đổi
  runtime/UI, schema, cấu hình Supabase hoặc booking. Không cần build lại cho
  thay đổi test/tài liệu; hai build đã đạt ở nghiệm thu Phần 3 cùng runtime này.
- Các ca còn thiếu vẫn là callback email end-to-end, metadata staff thật,
  expired-JWT cookie refresh thật và JWT Staff/Admin từ tài khoản test được duyệt.
  Bằng chứng A/B, own profile, inactive và explicit SDK refresh bên dưới được giữ
  nguyên là kết quả lịch sử, không giả định đã chạy lại trong lần này.

Không nâng quyền Customer hiện có để tạo kết quả kiểm thử. Callback email cần
operator mở thư trong cùng browser PKCE; Staff/Admin cần tài khoản test chuyên
dụng được operator cấp quyền. Không dùng mock thay thế các điều kiện đó.

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

## Nghiệm thu Phần 4 · 02/10/2026

Runner JWT hết hạn tự nhiên (session 16686) trả `COMPLETE: expired-JWT
Production gate PASS`. Auto-refresh tắt; JWT/cookie giữ nguyên đến expiry,
sau đó gửi Production `/profile`. Các bằng chứng thực tế:

- Profile Staff renders; Proxy trả Auth cookie HttpOnly/Secure/Lax và no-store.
- Auth xác minh JWT mới: cùng user, expiry muộn hơn, trusted Staff active.
- Request Production tiếp theo nhận phiên mới, response private no-store.
- Logout phiên test đạt; không đổi cookie trình duyệt của người dùng.

Kết hợp callback email end-to-end local và metadata staff giả đã PASS trong
session 88238: QA confirmed, trusted Customer active, callback HTTP 307 tới
`/profile`, cookie HttpOnly/Lax, downstream session và logout. Đây là bằng
chứng callback **local**, không gán callback Production PASS.

Phần 4 PASS trong phạm vi Identity/Auth đã thống nhất, cùng các ca A/B,
inactive, Staff/Admin và hồi quy đã ghi nhận. Reset password/dashboard/booking
ngoài phạm vi nghiệm thu này. Các mục PARTIAL trước đó giữ làm lịch sử.
Lượt kiểm tra chỉ đọc runner/cập nhật tài liệu; không tạo phiên Auth mới,
không signup/resend, không sửa runtime/RLS/quyền, không commit/push/deploy.

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

## Phần 6 · Customer booking management · 02/10/2026

| Nhóm | Kết quả / giới hạn |
| --- | --- |
| Migration production | PASS — `202610020001_customer_booking_management.sql` áp dụng thành công trên `unhybmmbgumyhzaftlli`; không seed/reset catalogue |
| `cancel_booking` contract | PASS — Customer active + ownership, pending/confirmed, mốc database `>= 60 phút`, lock, `customer_cancelled`, retry cancelled no-op |
| Atomic side effects | PASS theo migration contract — booking/history/notification/audit dùng cùng transaction; không cấp UPDATE trực tiếp booking |
| History RLS | PASS theo migration contract — Customer chỉ đọc history booking của mình; Staff/Admin giữ khả năng đọc vận hành |
| Cancel route | PASS mock/contract — same-origin, Customer-only, UUID validation, safe projection và lỗi window/ownership/transition |
| Notification route | PASS mock/contract — chỉ cập nhật `read_at` với recipient hiện tại, no-store, same-origin |
| Customer UI | PASS build/static review — `/my-bookings`, `/my-bookings/[id]`, loading/empty/error, detail/history/cancel/notification; giữ editorial UI, không dashboard |
| Typecheck/lint/build | PASS — typecheck, lint, normal Next build và Pages build; Pages loại API/Auth, giữ route preview tĩnh |
| Database integration | PASS — 35 nhóm trên PostgreSQL 18.4 loopback 55439, database mới trống `mocvi_test_phase6_20261002_b`; 4 migration và seed hai lần, catalogue giữ nguyên |
| Live Customer cancellation | PASS — booking QA `Phase 5 pair QA` đã chuyển sang `cancelled` trên Production; detail history ghi `customer_cancelled` do Customer và `/my-bookings` hiển thị thông báo hủy |

Kiểm chứng bổ sung 02/10/2026:

- Predicate thời gian thực tế được RPC sử dụng: đúng 60 phút PASS, dưới mốc
  một microsecond bị từ chối, trên mốc một microsecond được phép. SQL kiểm soát
  thời gian đầu vào; không thay đồng hồ production hoặc giả kết quả HTTP boundary.
- RPC trên PostgreSQL thật: hủy pending/confirmed, dưới 60 phút, terminal state,
  ownership A/B, Guest/Staff/Admin/inactive, trả lại availability và retry PASS.
- Hai kết nối độc lập cùng chờ advisory lock: cancel/cancel, cancel/confirm và
  cancel/system-expire PASS; history/notification/audit không ghi trùng.
- Trigger lỗi có chủ đích chứng minh cancellation và mọi side effect rollback.
- Notification read_at chỉ owner được cập nhật; sửa recipient/history bị chặn.
- Migration `202610020002_customer_cancellation_expiry.sql` áp dụng thành công
  lên production: pending hết hạn được đóng với source system/pending_expired;
  chỉ xử lý target của Customer, không expire các booking không liên quan.
- Production Customer đã đánh dấu thông báo QA hủy đã đọc thành công.

SQL fixture kiểm chứng nghiệp vụ/RLS, không giả là kiểm thử JWT. Live JWT
Customer hủy/list/detail/history/notification trên Production đã ghi nhận ở trên.
Nghiệm thu **Phần 6 PASS trong phạm vi Customer booking management**:
typecheck/lint, normal build, Pages build và 506 tham chiếu basePath PASS;
HTTP Identity/booking smoke local (mutations tắt) PASS. Sai cổng local ban đầu
đã xử lý bằng chạy server đúng origin callback cấu hình, không đổi cloud config.
Production deployment `36f8288` Ready, domain chính phục vụ list/detail mới.
List/detail ở 320/704/1024/1600px không horizontal overflow; mã booking wrap,
history hiển thị tiếng Việt và console không có error trong lượt QA.
Notification QA đã đọc giữ trạng thái sau reload. Các gate boundary/race/rollback
được chứng minh bằng SQL fixture, không gán thành live JWT race trên production.
Staff/Admin dashboard, scheduler, email/SMS, payment và reset password ngoài phạm vi.

## Phần 7 · Staff operations · 02/10/2026

| Nhóm | Kết quả / giới hạn |
| --- | --- |
| Staff migration | PASS local — `202610030001_staff_operations.sql` áp dụng trên database `mocvi_test_*` sạch; grants chỉ cho authenticated, RPC tự kiểm tra Staff/Admin active |
| Booking transitions | PASS local — confirm, reject có lý do, Staff cancel có lý do, check-in ghi `actual_guest_count`/`checked_in_at`, no-show theo database clock, complete ghi `completed_at` và chuyển bàn sang cleaning |
| Table operations | PASS local — cleaning → available qua RPC riêng; đổi bàn atomic, kiểm tra sức chứa/xung đột và ghi history/audit |
| Staff create | PASS contract/local SQL — phone/walk-in confirmed ngay, không gắn customer giả; website/Customer không được dùng source vận hành |
| Authorization | PASS — Customer bị từ chối ở RPC/route contract; active role kiểm tra lại trong từng thao tác; inactive fail closed theo identity layer |
| API/UI | PASS contract/build — same-origin JSON, Content-Type, UUID/reason validation, `/staff`, chi tiết booking, bảng trạng thái bàn và form phone/walk-in |
| Regression | PASS — 38 nhóm SQL trên PostgreSQL 18.4; Staff route contract, typecheck, lint, normal build và Pages build |
| Production migration | NOT RUN — chưa có phiên SQL Editor/database owner trong workspace; không áp migration hoặc claim production PASS |
| Production scheduler | NOT RUN — pg_cron/job chưa được xác minh hoặc tạo trên Supabase production |

Phần 7 hiện là **PARTIAL theo tiêu chí production**: implementation và local
integration đã đạt, còn thiếu áp dụng migration, cấu hình pg_cron mỗi phút và
kiểm thử Staff bằng JWT thật trên `unhybmmbgumyhzaftlli`. Không dùng publishable
key để thực hiện DDL và không tự reset/seed production.

### Phần 7 — cập nhật bằng chứng 02/10/2026 (thay thế trạng thái NOT RUN phía trên)

| Gate | Bằng chứng hiện tại |
| --- | --- |
| SQL local sạch | 49 nhóm PASS trên PostgreSQL 18.4; không dùng Supabase làm fixture |
| Staff hardening | Giữ reserved guest count; actual riêng; check-in chặn checked_in khác dù table status stale/interval cũ; không tự đặt late-checkin deadline |
| Retry | Receipt private actor/request; replay giữ kết quả gốc, payload khác bị chặn; event/notification/audit không trùng |
| Transaction | Event failure rollback booking, table state và receipt; race check-in/no-show, cancel/check-in chỉ một winner |
| Move | Consent bắt buộc ngay RPC; giữ lịch và khách; history ghi bàn cũ/mới; cùng request không trùng event |
| Production DDL | Staff 001/002/003 đã áp nguyên tử qua SQL Editor project được duyệt, không seed/reset/cấp role |
| Grants production | authenticated EXECUTE wrapper=true; anon=false; authenticated direct staff_update=false |
| Scheduler production | Jobid 1, `mocvi-expire-pending`, mỗi phút, active; `cron.job_run_details` succeeded 14:42/14:43/14:44 UTC |
| Scheduler end-to-end | Chưa nghiệm thu booking QA chờ đủ pending_minutes rồi tự hết hạn; không đổi policy/clock |
| Staff JWT production | Login thành công, profile role Staff; chu trình thao tác sau rollout còn cần kiểm chứng |

Nguồn SQL scheduler có kiểm tra job trùng và không sửa job khác:
[`phase7-scheduler.sql`](../supabase/operations/phase7-scheduler.sql).
Không coi contract/mock/local SQL là JWT production PASS. Kết luận hiện tại: **PARTIAL**.

### Phần 7 — bằng chứng bổ sung và điểm dừng kiểm thử production

- Database loopback sạch `mocvi_test_staff_final_20261002`: **52 nhóm PASS**.
  Move/create race giữ một destination hold, giữ bàn cũ khi move thất bại;
  Staff wrapper confirm/expire chỉ ghi một system transition.
- Walk-in local dùng giờ phục vụ/duration fixture riêng, khôi phục finally;
  confirmed ngay, customer_id null, retry cùng request không trùng event và
  thời điểm đến trong tương lai bị chặn. Không gán đây là JWT production PASS.
- Production deployment `431facd` Ready đã được đối chiếu domain và commit.
- Staff JWT/UI tạo phone QA `7d09de91-7e8a-4e97-b9e0-3335d8166c5d` thành công;
  confirmed, T1-B03, 2 khách đặt, không gắn Customer. UI đổi sang T1-B04 đã
  thành công; history ghi T1-B03 → T1-B04, lý do và khách đồng ý. Chưa check-in;
  không tạo occupied/cleaning bằng ca này, booking vẫn confirmed ở lần đọc cuối.
- Scheduler QA `c31e7847-d79d-4243-8865-d6255c9b3c82`, pending website,
  expires_at hiển thị 22:40:24 ngày 02/10 Asia/Ho_Chi_Minh. Không sửa thời hạn
  hay policy. SQL chỉ đọc kết quả bị timeout trước khi đọc được status/count;
  chưa xác minh cancelled/pending_expired hoặc chống event trùng sau cron.
- Trình duyệt nhúng kẹt ở hộp thoại native đổi bàn; operator đóng hộp thoại,
  rồi UI đã chứng minh move thành công. Đổi sang xác nhận trong form với khóa
  input, focus Quay lại, Escape. Source contract PASS không thay thế browser QA.
- Còn phải kiểm chứng trên production: confirm/reject/cancel, walk-in,
  check-in/complete/ready, no-show, scheduler tự nhiên, Admin operations và
  responsive 320/704/1024/1600. Sau giờ phục vụ không đổi policy để ép walk-in.

Giữ **PARTIAL**, bảo toàn history/audit QA và mọi dữ liệu ngoài QA. Khi browser
hoạt động lại, đọc kết quả trước khi lặp mutation; không tạo request mới cho
thao tác đã thành công. Không gọi SQL local fixture là JWT production.

Bản sửa xác nhận trong form: typecheck, lint, Staff/booking/Customer contracts,
Pages build (Staff không chứa QA, menu dùng /nhahang/images), normal build và
HTTP Identity/public/Guest Staff APIs PASS. Guest page dùng streamed redirect
Next.js tới /login, không trả dữ liệu booking; không đòi HTTP 307 khi redirect
đã được stream bằng meta refresh. Responsive/live confirmation chưa nghiệm thu.

### Phần 7 — nghiệm thu cập nhật 03/10/2026

Mục này thay thế các trạng thái chờ ở những ghi nhận Phần 7 phía trên; không
thay đổi lịch sử kiểm thử Auth. Kết luận: **PARTIAL**, chỉ còn nghiệm thu tạo
walk-in thành công bằng JWT production trong giờ phục vụ thật.

| Gate | Kết quả và phạm vi bằng chứng |
| --- | --- |
| SQL local | **53 nhóm PASS**, PostgreSQL 18.4, database sạch `mocvi_test_staff_boundary_20261003` |
| Biên thời gian | Đánh giá predicate lấy từ hàm đã cài tại đúng biên và ±1 microsecond; check-in quá sớm `[true,false,false]`, no-show quá sớm `[true,true,false]`; giữ các ca RPC và race hiện có |
| Production Staff | Confirm/reject/cancel, check-in/complete/ready, no-show thực hiện qua UI/JWT thật; check-in vượt capacity, check-in/no-show quá sớm bị từ chối |
| Production Admin | Profile trusted role Admin được xác minh; hủy fixture confirmed thành công, có lý do |
| Ready nhiều chu kỳ | Hai chu kỳ check-in → complete → cleaning → available trên T1-B03 trong cùng bảng bàn đang mounted; SQL ghi **2 ready audit events** |
| Phân quyền production | **14 kiểm tra PASS**: Staff/Customer trusted active, Staff API nhận request và validate schema, Customer API 403, Guest API 401, Customer/Guest RPC 42501, trang Staff chặn Customer; response API no-store |
| Responsive | Staff board và chi tiết tại 320/704/1024/1600px; client width 305/689/1009/1585px do scrollbar, body/root không tràn ngang; console error 0 |
| Accessibility | Chọn marker T1-B05 bằng Enter cập nhật aria-pressed; xác nhận inline có focus và không phụ thuộc hộp thoại native |
| Regression | Typecheck, lint, Staff/booking/Customer contracts, Pages build rồi normal build, Identity HTTP smoke và public/Guest Staff routes PASS |
| Deployment runtime | `56735e5`, Vercel báo deployment completed; production mobile và hai chu kỳ ready được kiểm tra sau rollout |

Local `.env.local` đang trỏ development; HTTP smoke local không được coi là
bằng chứng production. Permission probe production dùng URL/key public của
project được duyệt và JWT thật trong bộ nhớ, không lưu credentials vào repo.

**Scheduler tự hết hạn — PASS:** booking QA
`c31e7847-d79d-4243-8865-d6255c9b3c82` có expires_at
`2026-10-02T15:40:24.38002Z`, chuyển cancelled/pending_expired lúc
`2026-10-02T15:41:00.047475Z`. Job `mocvi-expire-pending` succeeded lúc
`15:41:00.041368Z`; sau nhiều lượt cron vẫn **2 history / 2 notifications /
2 audit** (gồm sự kiện tạo và hết hạn). Transition hết hạn có source system,
actor null. Không gọi hết hạn thủ công hoặc đổi policy/đồng hồ.

**Fixtures mới được operator duyệt:** owner chỉ chuẩn bị booking QA trên bàn
trống, history ban đầu source system/actor null ghi rõ không phải JWT create
evidence. Các transition sau đó thực hiện bằng Staff/Admin UI thật:

| Booking QA | ID | Kết quả cuối |
| --- | --- | --- |
| Service | `4558171f-aa41-4e28-b599-7058ff58c1c6` | completed, reserved 2 / actual 3 |
| Service cycle 2 | `cfa134d1-24d3-4c6d-b01c-2ac886c57bd3` | completed, actual 2 |
| No-show | `a5735b55-7150-420f-a798-a7e06e7d6e48` | no_show |
| Confirm | `a033a269-3c6c-4a9b-90b9-8584980c81bd` | Staff confirmed, sau đó Admin cancelled |
| Reject | `75a708f7-d5e2-40d3-b523-c45b303715ae` | rejected |
| Cancel | `03037c18-0959-4315-9650-7ce2fe2c2aae` | cancelled |

Phone QA cũ `7d09de91-7e8a-4e97-b9e0-3335d8166c5d` đã cancelled sau ca
đổi bàn thành công. Lần đọc cuối xác minh **22/22 bàn available**; giữ nguyên
history/audit QA, không xóa dữ liệu để làm sạch kết quả.

**Gate còn lại:** sau 10:00, tạo walk-in PHASE7 QA bằng Staff/Admin trên bàn
thực sự khả dụng, xác minh confirmed/customer_id null và chu trình phục vụ,
rồi dọn bàn available. Không dùng owner fixture để thay ca tạo walk-in thật,
không đổi policy production. Operator chọn tự gọi tiếp sau 10:00: **không
lên lịch hoặc chạy kiểm thử tự động lúc mở cửa**.

### Phần 7 — nghiệm thu walk-in production đạt — 03/10/2026

Gate cuối được thực hiện sau 10:00 bằng UI Staff trên production với JWT thật.
Booking QA `2c5e4f18-47bf-4136-8c2e-fe9dedb1ff00` được tạo lúc 10:16
Asia/Saigon trên T1-B02, 2 khách. Truy vấn owner sau thao tác chỉ dùng để đọc
đối chiếu, không tạo hoặc sửa dữ liệu:

```text
source=walk_in
status=confirmed → completed
customer_id=null
guest_count=2
actual_guest_count=2
table=T1-B02
history_count=3
audit_count=3
```

Chu trình UI/JWT đạt `confirmed → checked_in → completed`; Staff xác nhận dọn
bàn sau đó và bàn trở lại `available`. Đọc lại production cho thấy **22/22 bàn
available, 0 cleaning**. Không có booking thứ hai để giả lập retry; history ghi
đúng ba chuyển trạng thái thực tế.

Với gate này, **Phần 7 PASS trong phạm vi Staff operations đã thống nhất**.
Các fixture owner-prepared trước đó vẫn được giữ để chứng minh các nhánh nghiệp
vụ khác; chúng không được dùng thay cho bằng chứng walk-in này. Không đổi policy,
giờ phục vụ, role, RLS hoặc scheduler.

### Phần 8 — Admin management (đã kiểm chứng target database, còn gate runtime)

Migration mới `202610030004_admin_management.sql` chưa được coi là đã áp dụng
production chỉ từ việc file tồn tại trong repo. Gate local cần chạy trên database
sạch: Admin active được đọc/sửa qua RPC; Guest/Customer/Staff/inactive Admin bị
chặn; direct table write và private helper bị chặn; expected-value conflict không
ghi audit; policy/hours overlap, capacity/table state, image allowlist, area/menu
inactive và last active Admin được kiểm tra. Chạy hồi quy booking/Customer/Staff
sau migration.

Gate production phải dùng Admin test chuyên dụng đã được operator xác minh. Ưu tiên
read-only trước; mutation chỉ dùng fixture `PHASE8 QA`, lưu before/after và hoàn
nguyên được dữ liệu QA, giữ audit. Không đổi role/active của tài khoản thật,
không đổi giờ/giá canonical để lấy PASS. Cần chứng minh menu đổi qua Admin xuất
hiện trên Vercel live, inactive item không lộ public, `/admin` chặn non-Admin và
audit chỉ Admin đọc được. GitHub Pages chỉ kiểm tra snapshot và không gọi Admin API.

Kiểm tra bổ sung ngày 03/10/2026 trên Supabase project `unhybmmbgumyhzaftlli` qua
SQL Editor đã xác nhận target database state của migration: đủ 10 public RPC Admin
và 2 private helper tồn tại; 10 public RPC đều `SECURITY DEFINER`, chỉ
`authenticated` có EXECUTE, `anon` không có EXECUTE; bốn policy đọc inactive cho
Admin tồn tại trên `areas`, `tables`, `menu_categories` và `menu_items`. Lần chạy
lại SQL nguyên bản dừng ở lỗi policy đã tồn tại; migration local đã được bổ sung
`drop policy if exists` cho bốn policy Admin để có thể chạy lại an toàn. Không
seed/reset catalogue, đổi role, đổi policy booking hoặc ghi dữ liệu nghiệp vụ.

Trạng thái hiện tại: **PARTIAL — target database state đã kiểm chứng; còn thiếu
SQL integration trên database sạch, JWT/Admin UI production, chứng minh public
live menu sync và deployment smoke**. Không dùng build hoặc toast làm bằng chứng
quyền database.

### Phần 8 — bổ sung QA local và migration an toàn — 03/10/2026

Database loopback sạch `mocvi_test_admin_20261003k` đã chạy toàn bộ 10 migration,
seed hai lần và **68 nhóm PASS**. Có 12 nhóm Admin mới: Guest/Customer/Staff/
inactive Admin bị từ chối, private helper/direct write bị chặn, expected đầy đủ,
stale edit và hai request đồng thời chỉ một thắng, audit rollback/no-op không
nhân đôi, RLS inactive, image allowlist/numeric hữu hạn, policy/lịch, capacity
với actual guest/checked-in quá giờ, race Admin với booking và race hai Admin
không thể loại bỏ tất cả Admin active. Audit access chỉ chứa role/active,
không chứa contact. Đây là SQL integration, không phải JWT bằng fixture.

Migration 005 đã thực thi thành công trên project `unhybmmbgumyhzaftlli` qua SQL
Editor. Migration 006 bổ sung validation không đổi quyền. Chưa dùng kết quả local
để gán PASS production; bằng chứng nghiệm thu JWT/UI/deployment ghi riêng sau QA.

### Phần 8 — nghiệm thu runtime và production — 03/10/2026

Mục này thay thế trạng thái PARTIAL Phần 8 phía trên; giữ lịch sử các lần kiểm tra.
**PASS trong phạm vi Admin management đã kiểm chứng**, không chứng nhận các ca
production chưa thực hiện được mô tả dưới đây.

| Gate | Bằng chứng thực tế |
| --- | --- |
| Migration | 005 và 006 chạy thành công qua SQL Editor đúng project `unhybmmbgumyhzaftlli`; không seed/reset hoặc đổi role |
| SQL local | Database trống `mocvi_test_admin_20261003k`, 10 migration, seed hai lần, 68 nhóm PASS; gồm 12 nhóm Admin và hồi quy booking/Customer/Staff |
| JWT Admin production | Trusted Admin active, API/RPC lưu trạng thái món thành công; đọc lại database/public; stale retry 409; save giống hệt không thêm audit |
| Inactive/public RLS | Món thử inactive bị ẩn với anon và không xuất hiện trong Menu public; Admin vẫn đọc được |
| Quyền production | Guest API 401/RPC từ chối; Staff/Customer bị chặn trang/API/RPC và không đọc được audit; foreign origin 403; tự hạ quyền Admin bị từ chối |
| UI live sync | Admin đổi availability MV-KV01 → public Menu hiện Tạm hết; lưu khôi phục → public Menu hiện Đang phục vụ, tên/giá gốc giữ nguyên |
| Khôi phục QA | Helper finally khôi phục toàn bộ editable fields món; ca UI khôi phục availability; giữ audit, không sửa role/active của tài khoản |
| Responsive/a11y | Admin và Home/Menu/Spaces/ba tầng/Reservation ở 320/704/1024/1600px không whole-page overflow; Admin không có enabled control thiếu nhãn; console error không ghi nhận |
| Typecheck/lint/contracts | PASS; contract booking/Customer/Staff PASS |
| Pages | Build PASS, 20 HTML, basePath `/nhahang`, 39 image src được đối chiếu resolve, không export API hoặc URL development/Supabase trong rendered HTML |
| Normal build/local HTTP | Build PASS; start normal port 3018; tám trang public HTTP 200, không thông báo lỗi live data |
| Deployment | Runtime `1b5c1f100aaff915a029703fd47eea2997f93a05`, Vercel combined status success; UI mới quan sát trên `moc-vi-restaurant.vercel.app` |

Live JWT suite hoàn tất hai lượt, lượt cuối trên deployment runtime nêu trên.
Credentials chỉ ở bộ nhớ tiến trình/phiên test, không đưa vào repo hoặc báo cáo.
Local HTTP dùng override môi trường riêng của tiến trình để đọc project được
duyệt; `.env.local` vẫn giữ development, không chỉnh file cấu hình.

**Giới hạn bằng chứng:** thử submit UI hạ quyền Admin bị cơ chế an toàn chặn
trước request. Không retry để vượt chặn, không đổi quyền thật và không gán ca
browser này PASS. Self-protection đã kiểm tra bằng SQL và JWT; thay đổi quyền,
inactive/last-active và race giữa Admin kiểm chứng ở database local cô lập,
không phải mutation role production. Không thay thế kết quả local bằng toast.

Đổi tầng của bàn bị chặn `SPATIAL_MAPPING_REQUIRED` đến khi có mapping tọa độ
được duyệt; không chế tọa độ hoặc tạo bảng dữ liệu thứ hai. Giới hạn truy vấn
10.000 dòng báo lỗi thay vì cắt âm thầm, báo cáo tối đa 93 ngày, hồ sơ phân trang
25 dòng. Combo vẫn snapshot; upload ảnh, CRUD mới ngoài catalogue, reset mật
khẩu, tài chính, multi-branch và 3D ngoài phạm vi. Các thay đổi 3D chưa commit
được bảo toàn và không đưa vào commit Admin.

### Phần 9 — system QA, hardening và CI — 03/10/2026

**PASS trong phạm vi các gate đã thực hiện; không phải chứng nhận mọi tính năng
ngoài MVP.** Commit runtime không đổi UI/logic sau nghiệm thu Phần 8; Phần 9
bổ sung alias test và workflow CI cô lập.

| Gate | Môi trường và kết quả |
| --- | --- |
| SQL integration | Database loopback mới `mocvi_test_phase9_20261003`, migrations 001–006, seed hai lần: **68 nhóm PASS** |
| Identity contract | `pnpm test:identity:contract`: PASS metadata/role/inactive/callback/Proxy contracts; ghi rõ không phải JWT thật |
| Booking/Customer/Staff contracts | `pnpm test:booking`, `pnpm test:customer-booking`, `pnpm test:staff`: PASS; các phần mock/contract không thay thế production JWT |
| Catalogue/assets | `pnpm test:public-assets`: 50 WebP decode, 16 restaurant/30 dish/4 combo, 3 tầng/22 bàn/92 chỗ và spatial metadata PASS |
| Code quality | `pnpm typecheck`, `pnpm lint`, `git diff --check`: PASS |
| Normal build | Next.js 16.3.6 production build PASS; route server/API vẫn hiện diện |
| Pages build | `GITHUB_PAGES=true pnpm build` PASS; asset/export check PASS, 8 public routes, `/nhahang` basePath, không API route/private Supabase URL trong browser chunks |
| Local HTTP | Server normal với origin loopback và Supabase HTTP mock 401 tạm thời: identity/CSRF/no-store, guest fail-closed, booking mutation-off và public 8 routes/50 asset responses PASS; không ghi cloud |
| Browser evidence | UI unchanged từ runtime `1b5c1f1`; bằng chứng responsive 320/704/1024/1600, labels, image load và console error của Phần 8 được tái sử dụng, không tuyên bố ca UI mới |
| CI remote | Commit `d88798b`: [CI quality PASS](https://github.com/dangtuanminh2702206-wq/nhahang/actions/runs/37114247149), [Pages deploy PASS](https://github.com/dangtuanminh2702206-wq/nhahang/actions/runs/37114247136), [Vercel check PASS](https://vercel.com/minh-5f07/nhahang/3xxV6QZqbGuryozVb3RJ9WrMNQy4) |
| CI definition | `.github/workflows/ci.yml` dùng PostgreSQL service `mocvi_test_*`, lockfile install, mock Supabase loopback chỉ trả 401 cho HTTP guest smoke, quality gates, normal/Pages build tuần tự; không production secrets/cloud mutation |

Alias test được thêm vào `package.json` để tránh script tồn tại nhưng không thể gọi
qua `pnpm`. Commit `d88798b` đã push trên `codex/restaurant-booking-platform` và
đã có bằng chứng CI/Pages/Vercel nêu trong bảng trên.

Không phát hiện bug runtime mới cần sửa trong các gate local. Hai lỗi smoke ban đầu
là lỗi harness: khởi động server sau Pages build và dùng origin khác
`NEXT_PUBLIC_SITE_URL`; sau đó phát hiện build CI chưa có Supabase config nên profile
chạy demo, rồi bổ sung mock loopback và biến build/runtime chỉ dành cho CI. Đã rebuild
normal, chạy origin cùng cổng và cờ mutation-off chỉ trong tiến trình, không sửa
`.env.local`.

Không chạy signup/resend, role mutation, load test, migration cloud, thay policy,
đổi dữ liệu production hoặc thao tác 3D. JWT/Auth thật, live database và các giới
hạn đã ghi ở các phần trước vẫn phải được phân biệt với contract/local CI; mock
Supabase chỉ chứng minh guest fail-closed/HTTP guard, không chứng minh JWT thật.
