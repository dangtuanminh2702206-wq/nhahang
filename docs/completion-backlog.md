# Hoàn thiện Mộc Vị — backlog mở rộng

Nguồn yêu cầu: task mở rộng Phần 1–10 ngày 03/10/2026. Điểm bắt đầu:
`3d968be`, nhánh `codex/restaurant-booking-platform`. Bảng này mở rộng phạm vi
MVP; bằng chứng nghiệm thu lịch sử giữ ở `database-testing.md`.

| ID | Phần | Yêu cầu | Hiện trạng | Tiêu chí nghiệm thu | Phụ thuộc | Bằng chứng | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R01 | 1–9 | Hồi quy nền tảng | MVP đã nghiệm thu theo phạm vi cũ | Quality/SQL/HTTP/browser và CI theo commit mới | Database loopback, server cô lập | Contract/build/Pages gates chạy lại ngày 04/10; SQL integration thiếu database loopback | PARTIAL — database gate chưa chạy trong lượt này |
| R02 | 4 | Khôi phục mật khẩu | Recovery email production đã hoàn tất với thư mới | Validation/ownership/session; email thật, đặt mật khẩu mới và login lại | QA owner xác nhận | Contract/SDK storage PASS; owner xác nhận recovery production thành công ngày 04/10 | PASS — email recovery theo xác nhận operator |
| R03 | 4,8 | Role UI trên môi trường cô lập | SQL/JWT cũ đạt; browser production bị chặn | Admin-last/self/inactive/concurrent qua UI QA cô lập | Phiên test Admin/dev hợp lệ | database-testing.md | NOT RUN |
| R04 | 4 | Tài khoản QA đã lộ credential | Không đưa credential vào code hoặc báo cáo | Owner chọn tài khoản, đổi mật khẩu/thu hồi phiên rồi kiểm chứng | Xác nhận đúng tài khoản test và phiên owner | Chưa thay tài khoản | BLOCKED — owner action |
| R05 | 3,8 | Combo live và CRUD | Migration 007 đã áp; flag Production bật; 4 combo public live | Migration/RLS/audit/conflict/Admin/public; bảo toàn nội dung canonical | Số lượng chưa duyệt giữ NULL | 76 SQL local; Admin production create/update/hide; public live và combo trong ORDER QA PASS | PASS — catalogue CRUD đã nghiệm thu trong phạm vi |
| R06 | 3,8 | Upload ảnh | Catalogue file local | Upload validation/RLS/refs/alt/fallback/public/Pages đạt | Storage bucket và cấu hình upload | Chưa có implementation | TODO |
| R07 | 3,8 | Chuyển tầng/vị trí bàn | Cross-floor bị khóa | Preview tọa độ, canonical mapping, active-booking protection và audit | Quy tắc vị trí được duyệt qua Admin | Chưa có implementation | TODO |
| R08 | 4–7 | Email/SMS giao dịch | Notification nội bộ | Outbox/retry/idempotency/sandbox/email QA | Provider, sender/domain, SMS credentials nếu dùng | Đã hỏi cấu hình; chưa gửi | BLOCKED — provider; phần độc lập TODO |
| R09 | 5–8 | Đặt món gắn booking | Migration 007/008, cờ Production và runtime 6b435ab đã phát hành | Snapshot giá, tổng server, quyền/concurrency/audit/UI/integration live | Đã có Customer/Staff QA và fixture được duyệt | 86 SQL local; 15 assertions HTTP + database production ORDER QA PASS | PASS — rollout/workflow đã kiểm chứng; không phải mọi ca UI/production race |
| R10 | 5–8 | Thanh toán/hoàn tiền | Đã bỏ khỏi phạm vi đồ án | Không có payment gateway, webhook, đặt cọc hoặc hoàn tiền; thanh toán tại quầy | Không có | Spec nghiệp vụ đã chốt | OUT OF SCOPE |
| R11 | 8 | Kho | Chưa triển khai | Units/ledger/nhập-xuất-adjustment/permissions; định mức mới tự trừ | Danh mục thực và định mức cho automatic deductions | Chưa có implementation | TODO |
| R12 | 8 | Báo cáo mở rộng | Hiện có booking reports | Phân biệt booking/order/thực thu/hoàn tiền; không cắt dữ liệu ngầm | R09–R11 | Chưa có implementation | TODO |
| R13 | 1,2,5–8 | Nhiều chi nhánh | Schema single restaurant | Branch scope/migration/backfill/RLS/isolation/regression | Thiết kế tương thích và test trước cloud | Chưa có implementation | TODO |
| R14 | 3 | 3D/360 | Có thay đổi asset/tooling của công việc khác | Asset duyệt, panorama decode, hotspots đúng, viewer mobile/accessibility | Xác định bộ asset bàn giao và quyền sở hữu | Không stage artifacts/panorama/tools hiện có | BLOCKED — asset handover |
| R15 | 9,10 | Health/logs/scheduler | Thêm liveness tối thiểu | Health không lộ config; readiness/scheduler có bằng chứng riêng | Operator cloud cho scheduler | Endpoint chỉ chứng minh Next server sống | IN PROGRESS |
| R16 | 10 | Backup/restore | Đã export production mã hóa; công cụ có guard restore loopback | Database/Auth/Storage scope, backup retention, restore cô lập và đối chiếu | Restore tương thích Supabase; bản off-site và key recovery | 03/10: TLS/read-only/export/decrypt/archive list PASS; restore NOT RUN | PARTIAL — isolated restore/off-site/key recovery pending |
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
- Booking cũ không thay đổi; module order mới chưa có cloud fixture hoặc
  environment flag change.

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

Điểm tiếp tục: triển khai R06/R07 và tooling backup cô lập trong lúc chờ. Các nhóm R08–R14 vẫn chưa hoàn thành,
không đổi TODO thành PASS chỉ vì nhóm này build đạt.

### Nghiệm thu Admin combo trên production — 04/10/2026

- Admin active đã tạo một combo QA qua giao diện production, sau đó sửa tên,
  mô tả, giá và thành phần. Mỗi lần lưu thành công đều tạo audit và tăng version;
  không có thao tác DELETE.
- Combo QA đã được dọn bằng cách đặt `is_active=false` và
  `is_available=false`. Đọc lại database xác nhận bản ghi vẫn tồn tại với
  version cuối và đủ ba audit event; Admin vẫn đọc được bản ghi inactive.
- Sau khi deploy runtime fix `60ef984`, Menu public tải được catalogue live có
  combo động chưa nằm trong mapping ảnh canonical bằng media fallback an toàn.
  Sau cleanup, combo QA không còn xuất hiện trong Menu public hoặc catalogue đặt
  món; bốn combo canonical vẫn hiển thị và các field canonical không thay đổi.
- `pnpm test:combos`, `pnpm typecheck`, `pnpm lint` và `pnpm build` PASS. Vercel
  production đã được kiểm tra lại trên domain chính thức sau runtime fix.
- Không có phiên Customer/Staff hợp lệ trong lượt này để gửi mutation production
  nhằm chứng minh từ chối bằng JWT thật; không suy từ mock/local contract thành
  PASS production. Các gate role/RLS/validation/conflict local vẫn giữ bằng chứng
  76 nhóm SQL PASS.

R05 hiện **PASS trong phạm vi Admin combo catalogue đã thống nhất**. Upload ảnh,
CRUD catalogue ngoài combo, đổi tầng bàn, backup/restore và các mục TODO khác
không thuộc nghiệm thu này.

### Gate tài khoản và bàn giao cuối — kiểm tra lại 04/10/2026

- Contract recovery/identity, recovery cookie storage, combo, order, booking,
  Customer booking và Staff đều PASS. Các script contract tiếp tục ghi rõ đây
  không phải JWT/email production.
- `pnpm typecheck`, `pnpm lint`, normal `pnpm build`, Pages build,
  `pnpm test:public-assets` và Pages/basePath/link checks PASS. Bộ asset hiện tại
  vẫn là 50/50; catalogue là 3 tầng, 22 bàn, 92 chỗ, 30 món và 4 combo.
- `pnpm test:db` **NOT RUN** vì terminal chưa có `TEST_DATABASE_URL` trỏ tới
  PostgreSQL loopback trống có tên `mocvi_test_*`. Không dùng Supabase
  development/production để thay thế fixture và không reset/seed cloud.
- Recovery email thật vẫn **PARTIAL** do quota/provider và chưa có lượt mới được
  xác minh end-to-end. Không gửi lại thư để ép PASS.
- Role management qua UI trên môi trường cô lập **NOT RUN** trong lượt này vì
  chưa có provider/database cô lập và phiên synthetic phù hợp. SQL/contract local
  không được dùng thay cho JWT UI.
- Tài khoản QA có thông tin từng lộ vẫn cần owner tự đổi mật khẩu riêng và thu
  hồi phiên trong Supabase/Auth; mật khẩu mới không được gửi vào chat, URL, log
  hoặc repository. Khi chưa có bằng chứng thao tác này, gate được giữ BLOCKED.
- Bằng chứng production Customer → booking → order → Staff đã ghi ở phần đặt
  món trước đó và được tái sử dụng theo đúng commit/runtime đã kiểm chứng. Không
  tạo fixture production mới chỉ để lặp lại cùng một ca trong lượt này.

Trạng thái bàn giao hiện tại: **PARTIAL**. Các gate code, contract, build, Pages,
asset và các nghiệm thu production đã có bằng chứng đều giữ nguyên; database
integration, recovery email thật, role UI cô lập và rotation tài khoản QA cần
được hoàn tất trước khi công bố toàn bộ hệ thống đã nghiệm thu.

### Recovery email production — nghiệm thu bổ sung 04/10/2026

Thay thế kết luận recovery PARTIAL trong các lượt kiểm tra phía trên. Một yêu cầu
khôi phục mới trên domain production được chấp nhận, không còn báo quota ở bước
gửi. Operator xác nhận đã mở thư mới, đến form đặt mật khẩu mới, lưu mật khẩu
và đăng nhập lại thành công. Đây là bằng chứng E2E do operator xác nhận;
contract và SSR cookie storage cũng chạy lại PASS trong lượt này.

Không sửa runtime hoặc cấu hình Auth để đạt kết quả; không resend lặp, không
ghi mật khẩu hoặc link/token vào repository. R02 hiện PASS cho luồng recovery
email production. Chưa kiểm thử riêng việc mật khẩu cũ bị từ chối hoặc thu hồi
tất cả phiên đang tồn tại; không suy kết quả này thành R04 PASS hay JWT cũ bị
vô hiệu tức thì. Role UI cô lập và rotation các tài khoản QA khác vẫn còn mở.

### Backup prerequisite

Diễn tập tiếp theo: full archive restore vào loopback trống
`mocvi_test_restore_20261003_2110` FAIL vì extension `pg_cron` không có trên
PostgreSQL Windows; single transaction rollback, 0 relations sau lỗi. Không bỏ
extension hoặc dùng mock để gọi full restore PASS. Máy chưa có Docker/WSL Linux.
User chọn OneDrive cá nhân: đã copy archive mã hóa và DPAPI key riêng vào
`OneDrive/MocVi-Backups` ngoài source, SHA-256 nguồn/đích khớp. Cloud upload
chưa xác minh: browser OneDrive yêu cầu đăng nhập. DPAPI copy không chứng minh
khôi phục key trên máy khác.

Đã chuẩn bị `scripts/export-backup-recovery-key.ps1` để human tự nhập passphrase
riêng (không chat/arguments), xuất key envelope scrypt/AES-GCM ngoài Git.
Round-trip/wrong-passphrase/tamper có automated tests; chưa export key thật bằng
passphrase owner, chưa nghiệm thu cross-machine restore. Không lưu passphrase
cùng archive/key trên OneDrive. R16 vẫn PARTIAL.

Cập nhật sau khi owner sửa connection ngày 03/10: kết nối production chỉ đọc với
CA tải từ Supabase chính thức PASS (PostgreSQL 17.6). Dùng pg_dump/pg_restore
17.11 portable từ trang EDB chính thức, không cài service. Export mã hóa thành
công vào `LocalAppData/MocViBackups/mocvi-20261003-211024.mocvi.enc` (580916 byte).
Kiểm chứng AES-GCM authentication và `pg_restore --list`: 940 entries; có TABLE
DATA bookings/profiles/menu_items/auth.users/storage.objects. Không in entries
hoặc dữ liệu khách; không dump plaintext trên đĩa, không ghi database cloud.

Khóa bảo vệ bằng Windows CurrentUser DPAPI trong `LocalAppData/MocViBackupKeys`,
không cùng thư mục archive, không vào Git. Chưa xác minh portability/khôi phục
key khi mất máy/tài khoản Windows; chưa có off-site copy, restore cô lập hoặc
Auth service/Storage file recovery. Export/list PASS không phải DR PASS.
Tool hỗ trợ PGSSLROOTCERT cho cả Node và pg_dump, giữ xác minh hostname/TLS.
Wrapper PowerShell nạp `.env.local` qua Node --env-file, không sửa file secrets.

Ghi nhận trước khi owner cung cấp kết nối (lịch sử, không phải trạng thái mới):

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
