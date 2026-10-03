# Hoàn thiện Mộc Vị — backlog mở rộng

Nguồn yêu cầu: task mở rộng Phần 1–10 ngày 03/10/2026. Điểm bắt đầu:
`3d968be`, nhánh `codex/restaurant-booking-platform`. Bảng này mở rộng phạm vi
MVP; bằng chứng nghiệm thu lịch sử giữ ở `database-testing.md`.

| ID | Phần | Yêu cầu | Hiện trạng | Tiêu chí nghiệm thu | Phụ thuộc | Bằng chứng | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R01 | 1–9 | Hồi quy nền tảng | MVP đã nghiệm thu theo phạm vi cũ | Quality/SQL/HTTP/browser và CI theo commit mới | Database loopback, server cô lập | Lịch sử Phần 9; đang chạy lại gates liên quan | IN PROGRESS |
| R02 | 4 | Khôi phục mật khẩu | Request/callback/form đã lên production; user nhận thư nhưng callback lỗi | Validation/ownership/session PASS; email thật và login bằng mật khẩu mới | Quota email, QA xác nhận | Contracts/SDK storage PASS; callback E2E chưa đạt; provider đang 429 | PARTIAL — email quota blocks retest |
| R03 | 4,8 | Role UI trên môi trường cô lập | SQL/JWT cũ đạt; browser production bị chặn | Admin-last/self/inactive/concurrent qua UI QA cô lập | Phiên test Admin/dev hợp lệ | database-testing.md | NOT RUN |
| R04 | 4 | Tài khoản QA đã lộ credential | Không đưa credential vào code hoặc báo cáo | Owner chọn tài khoản, đổi mật khẩu/thu hồi phiên rồi kiểm chứng | Xác nhận đúng tài khoản test và phiên owner | Chưa thay tài khoản | BLOCKED — owner action |
| R05 | 3,8 | Combo live và CRUD | Migration, Admin/API/public live đã code; flag production chưa bật | Migration/RLS/audit/conflict/Admin/public; bảo toàn nội dung canonical | Khôi phục trước cloud; số lượng chưa duyệt giữ NULL | 76 SQL checks; contracts, browser mock và builds PASS local | PARTIAL — cloud migration/JWT QA pending |
| R06 | 3,8 | Upload ảnh | Catalogue file local | Upload validation/RLS/refs/alt/fallback/public/Pages đạt | Storage bucket và cấu hình upload | Chưa có implementation | TODO |
| R07 | 3,8 | Chuyển tầng/vị trí bàn | Cross-floor bị khóa | Preview tọa độ, canonical mapping, active-booking protection và audit | Quy tắc vị trí được duyệt qua Admin | Chưa có implementation | TODO |
| R08 | 4–7 | Email/SMS giao dịch | Notification nội bộ | Outbox/retry/idempotency/sandbox/email QA | Provider, sender/domain, SMS credentials nếu dùng | Đã hỏi cấu hình; chưa gửi | BLOCKED — provider; phần độc lập TODO |
| R09 | 5–8 | Order/phiếu tính tiền | Chưa triển khai | Snapshot giá, tổng server, quyền/concurrency/audit/UI/integration | Quyết định nghiệp vụ khi cần | Chưa có implementation | TODO |
| R10 | 5–8 | Thanh toán/hoàn tiền | Chưa triển khai | Thủ công có audit; online sandbox webhook/chữ ký/idempotency/đối soát | Provider, chính sách phí/đặt cọc/hoàn tiền | Đã hỏi; chưa thu tiền | BLOCKED — decisions; phần độc lập TODO |
| R11 | 8 | Kho | Chưa triển khai | Units/ledger/nhập-xuất-adjustment/permissions; định mức mới tự trừ | Danh mục thực và định mức cho automatic deductions | Chưa có implementation | TODO |
| R12 | 8 | Báo cáo mở rộng | Hiện có booking reports | Phân biệt booking/order/thực thu/hoàn tiền; không cắt dữ liệu ngầm | R09–R11 | Chưa có implementation | TODO |
| R13 | 1,2,5–8 | Nhiều chi nhánh | Schema single restaurant | Branch scope/migration/backfill/RLS/isolation/regression | Thiết kế tương thích và test trước cloud | Chưa có implementation | TODO |
| R14 | 3 | 3D/360 | Có thay đổi asset/tooling của công việc khác | Asset duyệt, panorama decode, hotspots đúng, viewer mobile/accessibility | Xác định bộ asset bàn giao và quyền sở hữu | Không stage artifacts/panorama/tools hiện có | BLOCKED — asset handover |
| R15 | 9,10 | Health/logs/scheduler | Thêm liveness tối thiểu | Health không lộ config; readiness/scheduler có bằng chứng riêng | Operator cloud cho scheduler | Endpoint chỉ chứng minh Next server sống | IN PROGRESS |
| R16 | 10 | Backup/restore | Đã chọn encrypted logical export miễn phí; công cụ có guard restore loopback | Database/Auth/Storage scope, backup retention, restore cô lập và đối chiếu | PostgreSQL backup connection, pg_dump/pg_restore; owner giữ key và bản off-site | Encryption/tamper/target guards PASS; export/restore thật NOT RUN | PARTIAL — connection/tooling prerequisite |
| R17 | 10 | Owner/RPO/RTO/rollback | Placeholder | Owner xác nhận người phụ trách và mục tiêu khôi phục | Người dùng trả lời | Đã hỏi, chưa tự gán | BLOCKED — owner decision |
| R18 | 9,10 | Phát hành | Commit theo nhóm | CI/Pages/Vercel đúng SHA và smoke domain sau push | Network/provider | Ghi ở từng nhóm bên dưới | IN PROGRESS |

## Bảo toàn và rollout

Các thay đổi trước task ở `scripts/test-public-assets.mjs`, `artifacts/`,
`public/images/restaurant/panoramas/`, `tools/` không thuộc commit của task này.
Chạy asset test trên worktree sẽ ghi rõ nếu test sử dụng thay đổi ngoài task.

Không có cloud migration hoặc fixture production trong nhóm Identity đầu tiên.
Rollback code bằng revert commit phát hành. Các module còn TODO không được
giới thiệu như đã có trên website. Các mục BLOCKED không chứng nhận PASS.

## Recovery và session

`/forgot-password` gửi qua Supabase Auth; rate limits của provider tiếp tục áp dụng.
Ứng dụng không thêm bộ giới hạn phân tán riêng trong nhóm đầu. Response lỗi thuộc
email không tiết lộ account membership. PKCE cần mở link trong cùng browser;
template OTP SSR có thể dùng `/auth/recovery?token_hash=...&type=recovery` nhưng
chỉ operator cấu hình. Không lưu link/token trong tài liệu.

`/reset-password` cho verified active user đổi chính mật khẩu của mình, kể cả
phiên đăng nhập hiện có. API không nhận target user ID. Sau đổi thành công gọi
global sign-out; refresh tokens của các phiên bị thu hồi khi provider thành công,
JWT đã phát hành vẫn có expiry riêng. Lỗi sign-out sau update được báo là
"mật khẩu đã đổi, chưa xác nhận đăng xuất mọi phiên", không giả rollback mật khẩu.

## Điểm tiếp tục

Hoàn tất kiểm thử/phát hành nhóm Identity và health, rồi tiếp tục R05–R07.
Thông tin provider, policy tài chính, owner và bàn giao asset được hỏi một lần;
thiếu câu trả lời không ngăn các phần code/SQL độc lập.

## Production recovery — 03/10, cần điều tra callback

Runtime `c86a7da`, tài liệu/CI `cf09cc9`: CI 37122838138 và Pages
37122838143 success; Vercel status success trên cùng SHA; health production
trả đúng `{status: ok}`. Trang forgot-password public hiển thị đúng.
Supabase redirect allowlist đã thêm chính xác `/auth/recovery` trên domain
production, giữ nguyên Site URL và ba redirect cũ, không thêm wildcard.

Người dùng xác nhận nhận được email nhưng callback quay về nhập email, thử hai
trình duyệt vẫn lỗi. **Email delivery observed; recovery E2E FAIL/IN INVESTIGATION**,
không nâng R02 thành PASS. Bổ sung phân loại thông báo browser/expired/account/
service/invalid, không phản chiếu lỗi thô, token hoặc code. Test bằng SDK SSR
đang cài chứng minh verifier cookie được lưu, same-browser exchange thành công
và missing-cookie bị chặn với provider synthetic; chưa thay thế bằng chứng thật.
Chờ thông báo phân loại production để xác định nguyên nhân trước khi gửi thêm thư.

Người dùng thử yêu cầu mới và gặp email rate limit. Không resend, đổi SMTP,
expiry hoặc giới hạn; giữ R02 PARTIAL. Commit diagnostic `253e3fc`: CI
37124312558, Pages 37124312603 và Vercel check success đúng SHA.

## Nhóm combo — local 03/10

- Migration `202610030007_combo_catalogue.sql` additive; chưa áp cloud. Bảo toàn
  đúng 4 combo, tên/giá/guest count/mô tả và mọi chuỗi thành phần. Quantity và
  menuCode NULL khi chưa có xác nhận; không tự trừ kho hay biến chuỗi thành định mức.
- Admin create/update/archive qua RPC; không DELETE. Whitelist, reason, version
  compare-and-swap, immutable code, audit atomic, no-op không tăng version/event.
  Chỉ cho 4 path ảnh local hiện có hoặc NULL; upload Storage là nhóm R06 riêng.
- Sau lỗi test anon gọi helper không được grant, tách policy guest active-only
  khỏi policy authenticated/Admin. Chạy lại toàn bộ trong DB mới
  `mocvi_test_combo2_20261003`: **11 migrations, 76 nhóm SQL PASS**. Guard database
  loopback trống không đổi. Fixtures FINAL QA chỉ trong DB test, không cloud.
- Combo API/live contract, identity/storage, booking/customer/staff contract,
  typecheck/lint PASS. Pages build/export PASS 50 assets và basePath; normal
  build PASS. Asset script vẫn là thay đổi của task 3D, không stage.
- Browser local 3020, provider fixture loopback 54321: Admin form và Menu ở
  320/704/1024/1600 không overflow, input đều có label, một h1. Lưu tên -> version
  mới -> Menu live đổi tên; unavailable -> public "Tạm hết". Đã hoàn nguyên tên
  và availability trong provider synthetic. Console warn/error không thấy.
  Đây là UI/transport mock, không phải JWT/RLS production; SQL kiểm chứng riêng.
- Proxy bổ sung Admin/API Admin để refresh cookie và no-store trước render;
  contract bảo vệ matcher này.
- Feature `COMBO_CATALOGUE_ENABLED` chỉ bật server khi đúng migration đã áp và
  rollout được kiểm chứng. Khi tắt, combo snapshot được ghi nhãn tham khảo. Khi
  bật nhưng DB lỗi, không fallback giả live. Pages luôn giữ 4 combo canonical.
- Chưa thay booking/order cũ; chưa có cloud fixture hoặc environment flag change.

### Rollout/rollback nhóm combo

Kiểm tra trước cloud: đúng ref, migrations trước tồn tại, bảng/RPC mới chưa có,
baseline public giữ 4 combo. Migration chỉ tạo bảng/helper/RPC/policy mới và insert
4 combo, không UPDATE/DELETE bảng cũ. Bật flag sau deploy tương thích. Before/after
phải đối chiếu số bàn/món/booking, combo và ACL; QA có nhãn, hoàn nguyên qua RPC.
Rollback code bằng revert/disable flag, giữ bảng/audit và dữ liệu combo mới (không
DROP/reset để khôi phục UI cũ). Cần backup strategy trước cloud theo task; Free
Plan chưa có backups; đã chọn encrypted pg_dump nhưng chưa có kết nối
DATABASE_BACKUP_URL hoặc PostgreSQL client binaries để export thật. Rollback
feature không được gọi là disaster recovery database/Auth/Storage đã PASS.

Điểm tiếp tục: nghiệm thu cloud combo sau khi đủ điều kiện; triển khai R06/R07
và tooling backup cô lập trong lúc chờ. Các nhóm R08–R14 vẫn chưa hoàn thành,
không đổi TODO thành PASS chỉ vì nhóm này build đạt.

### Backup prerequisite

Owner giao quyền chọn phương án ngày 03/10: chọn logical archive miễn phí, mã
hóa AES-256-GCM, không plaintext trên đĩa, không ghi đè file cũ, lưu ngoài repo.
`scripts/database-backup.mjs` chỉ restore vào loopback `mocvi_test_*` trống;
authentication tag được xác minh trước restore. Test encryption/tamper/project
ref/restore guards PASS. Giới hạn 256 MiB; tool failure/timeout không được tính PASS.
Chưa có backup credentials, pg_dump/pg_restore hoặc off-site copy được kiểm chứng;
không thay database password, không restore cloud, chưa đạt disaster recovery.
Đã tự kiểm tra mục Connect của project production: URI chỉ có
`[YOUR-PASSWORD]`; cấu hình local không có database connection/password.
Quyền thao tác dashboard không cho phép khôi phục mật khẩu gốc. Cần owner cung
cấp kết nối qua môi trường được bảo vệ; không gửi vào chat, không tự reset credential.

## Nhóm Identity/health — bằng chứng local 03/10

- Typecheck/lint và identity/recovery contracts PASS. Recovery provider là mock;
  chưa gửi thư hoặc đổi mật khẩu tài khoản thật.
- Booking/Customer/Staff contracts PASS. SQL loopback mới
  `mocvi_test_final_20261003`: 10 migrations, seed hai lần và **68 nhóm PASS**.
- Pages build PASS; 50 asset export, 8 public routes, 672 link/asset refs đúng
  basePath; không có API/cloud project URL trong browser chunks. Asset script
  sử dụng worktree hiện có nhưng thay đổi ngoài task của script không được stage.
- Normal build PASS với Supabase mock 401 loopback. HTTP Identity/booking smoke
  PASS ở server riêng 3020, mutations tắt; health chỉ trả `status: ok`.
- Browser guest: login/forgot-password/reset-password ở 320/704/1024/1600;
  không overflow toàn trang, một h1; input có label/autocomplete. Submit recovery
  tới mock giữ phản hồi không dò tài khoản, clear email và focus status. Console
  warn/error không có trong phiên này. Chưa kiểm tra form reset bằng JWT thật.
- Dashboard production backup read-only: Free Plan không có project backups.
  Không ghi cloud trong nhóm này. Deployment/CI được ghi sau push.
