# Runbook vận hành Mộc Vị Restaurant

Tài liệu này dành cho người phụ trách repository, deployment, Supabase và kiểm
thử bàn giao. Không đặt secret, mật khẩu, token, cookie hoặc connection string
vào tài liệu, GitHub hay chat.

## Trạng thái và phạm vi

- Repository: `dangtuanminh2702206-wq/nhahang`.
- Nhánh triển khai: `codex/restaurant-booking-platform`.
- Runtime server: [moc-vi-restaurant.vercel.app](https://moc-vi-restaurant.vercel.app/).
- Demo tĩnh: [dangtuanminh2702206-wq.github.io/nhahang](https://dangtuanminh2702206-wq.github.io/nhahang/).
- Supabase production được tài liệu hóa với project ref `unhybmmbgumyhzaftlli`.
- Baseline repo: 3 tầng, 22 bàn, 92 chỗ cấu hình, 30 món, 4 combo, 50 ảnh.
  Đây là baseline data/UI, không phải số lượng khả dụng live tại mọi thời điểm.
- Phần 1–9 đã nghiệm thu trong phạm vi tương ứng. Phần 10 xác nhận khả năng bàn
  giao và readiness, không mở thêm nghiệp vụ.

## Sơ đồ triển khai

```text
Git push
  ├─ GitHub Actions CI: lint, typecheck, contract, SQL loopback, build, HTTP smoke
  ├─ GitHub Pages: static public demo với basePath /nhahang
  └─ Vercel: Next.js server + Auth/booking/admin qua Supabase
                                  └─ Supabase PostgreSQL/Auth/RLS/RPC
```

Vercel là bản vận hành. Pages chỉ phục vụ HTML/CSS/JS public đã export; cookies,
Proxy, Route Handler phụ thuộc request và logic server không hoạt động trên Pages.

## Local setup

Yêu cầu Node.js 20.9 trở lên và pnpm 11.25 trở lên.

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm dev
```

Trên macOS/Linux dùng `cp .env.example .env.local`. Chỉ điền giá trị vào file
local hoặc secret store của môi trường; không commit `.env.local`.

| Biến | Mục đích | Quy tắc |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Origin cho callback, redirect và same-origin guard | Phải khớp origin; HTTPS trên production |
| `NEXT_PUBLIC_SUPABASE_URL` | URL public của project Supabase | Chỉ dùng project đúng môi trường |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key cho request scoped | Không dùng secret/service-role key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Fallback legacy cho publishable key | Chỉ dùng khi chưa có biến preferred |
| `BOOKING_MUTATIONS_ENABLED` | Cờ production cho tạo/hủy booking | Chỉ bật với origin HTTPS và project ref được duyệt |
| `BOOKING_LOCAL_MUTATIONS_ENABLED` | Cờ local development cô lập | Không tự bật production |
| `BOOKING_ALLOWED_SUPABASE_PROJECT_REF` | Project ref được phép cho booking mutation | Phải đối chiếu môi trường đã duyệt |
| `TEST_DATABASE_URL` | PostgreSQL loopback cho `pnpm test:db` | Database mới, trống, tên `mocvi_test_*` |
| `RESEND_API_KEY` | Dự phòng email về sau | Chưa tích hợp; không cần cho hiện tại |

Sau khi đổi biến `NEXT_PUBLIC_*`, build lại vì Next.js đưa biến public vào bundle
tại thời điểm build. Không dùng origin GitHub Pages cho Auth thật.

## Kiểm tra local trước bàn giao

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test:identity:contract
pnpm test:booking
pnpm test:customer-booking
pnpm test:staff
pnpm test:public-assets
pnpm test:db
pnpm build
pnpm start
```

`pnpm test:db` chỉ chạy với PostgreSQL loopback database mới, trống và có tên
`mocvi_test_*`. Script áp migration và seed trong database cô lập; không dùng
Supabase production/development cho runner có reset/seed. Nếu chưa có database
phù hợp, ghi `NOT RUN`.

Pages build phải chạy riêng sau khi normal build đã hoàn tất:

```powershell
$env:GITHUB_PAGES="true"
pnpm build
$env:PUBLIC_CHECK_PAGES="true"
$env:BOOKING_CHECK_PAGES="true"
pnpm test:public-assets
pnpm test:booking
```

Sau Pages build, build lại normal trước khi chạy `pnpm start`. Không dùng chung
output `.next` và `.next-pages` trong hai server đồng thời.

## CI và deployment

Push vào `codex/restaurant-booking-platform` hoặc Pull Request sẽ chạy
`.github/workflows/ci.yml`. Workflow cài bằng lockfile, dùng PostgreSQL service
`mocvi_test_*`, chạy quality gates, normal build, HTTP smoke với mock Supabase
loopback 401 và Pages build tuần tự. Workflow không cần Supabase credentials,
Auth account, email hoặc cloud mutation.

`.github/workflows/pages.yml` build `GITHUB_PAGES=true`, upload `.next-pages` và
deploy bằng GitHub Pages. Vercel deploy runtime Next.js theo repository/branch đã
liên kết. Sau mỗi push:

1. Mở CI run và kiểm tra đúng `head_sha`, không chỉ xem tên workflow.
2. Kiểm tra Pages run cùng SHA nếu có thay đổi public.
3. Kiểm tra Vercel deployment/check cùng SHA và trạng thái `success`.
4. Smoke read-only `/`, `/menu`, `/spaces`, `/reservation` trên Vercel và
   `/nhahang/`, `/nhahang/menu` trên Pages.
5. Đăng nhập QA chỉ khi có ca kiểm thử đã duyệt; không đưa credential vào log.

CI PASS là bằng chứng build/test trong môi trường cô lập. Nó không tự chứng nhận
JWT production, RLS production hoặc dữ liệu live.

## Migration và scheduler

Migration database phải additive, được review trước khi chạy và áp đúng thứ tự:

1. `202609300001_foundation.sql`
2. `202610010001_availability.sql`
3. `202610020001_customer_booking_management.sql`
4. `202610020002_customer_cancellation_expiry.sql`
5. `202610030001_staff_operations.sql`
6. `202610030002_staff_operations_hardening.sql`
7. `202610030003_staff_operation_receipts.sql`
8. `202610030004_admin_management.sql`
9. `202610030005_admin_safety.sql`
10. `202610030006_admin_input_validation.sql`

Quy trình áp dụng:

1. Xác định project và môi trường bằng dashboard, ref và kết nối operator.
2. Sao lưu hoặc xác minh khả năng khôi phục theo policy trước khi đổi schema.
3. Đọc migration, kiểm tra migration trước đó và dữ liệu ảnh hưởng.
4. Chạy một migration đúng một lần qua quy trình operator được duyệt.
5. Kiểm tra grants, RLS, RPC, audit và invariant liên quan.
6. Chạy smoke read-only và ghi commit/migration/evidence vào tài liệu.

Không sửa migration đã áp dụng để chữa lỗi. Tạo migration additive mới. Không
seed/reset môi trường có booking hoặc audit production.

Expiration là thao tác owner opt-in, không tự cài bởi migration. File
`supabase/operations/phase7-scheduler.sql` tạo hoặc kiểm tra job
`mocvi-expire-pending` mỗi phút với lệnh `select private.expire_pending();`.
Trước khi áp dụng, kiểm tra job trùng, schedule, database và `active`. Sau đó đọc
`cron.job` và `cron.job_run_details`, kiểm tra một booking QA pending đã hết hạn
theo database clock rồi dọn fixture theo quy trình đã duyệt. `job succeeded` chỉ
chứng minh scheduler chạy; phải quan sát booking chuyển trạng thái để kết luận
expiration hoạt động.

## Chẩn đoán nhanh

### Auth và callback

Kiểm tra `NEXT_PUBLIC_SITE_URL`, Supabase Site URL và redirect allowlist của đúng
môi trường. Callback redirect cố định về `/profile` hoặc `/login`; query `next`
không được tin cậy. Liên kết email phải mở trong trình duyệt đã đăng ký.
Nếu link hết hạn hoặc quota email bị giới hạn, ghi rõ lỗi và chờ operator; không
resend lặp lại, không giảm expiry và không đổi SMTP để làm test dễ hơn.

### Database hoặc live catalogue không tải được

Trang public Vercel hiển thị lỗi khi live database lỗi, không giả snapshot cũ là
dữ liệu live. Kiểm tra Vercel environment variables, project ref, Supabase status
và log server. Không in key, cookie hoặc payload booking.

### Booking conflict hoặc 409

Tải lại availability và booking detail trước khi thử lại. Kiểm tra ngày/giờ, sức
chứa, buffer, giờ phục vụ, ngày nghỉ và booking active. Không xóa history/audit
hoặc sửa đồng hồ/policy để vượt conflict.

### Admin conflict hoặc lỗi quyền

`409` nghĩa snapshot expected đã cũ; tải lại `/admin`. `401` yêu cầu đăng nhập;
`403` nghĩa role/is_active hoặc RLS không cho phép. Role/actor lấy từ Auth và
database, không lấy từ payload client. Không retry thao tác đổi role bị chặn.

### Deploy fail

Đối chiếu commit SHA, xem bước CI fail đầu tiên, chạy cùng lệnh local và kiểm tra
lockfile. Với Pages, kiểm tra `GITHUB_PAGES=true`, `.next-pages`, basePath `/nhahang`
và không có API/private runtime trong static output. Với Vercel, kiểm tra build
log và environment theo đúng target.

## Backup, restore và diễn tập

### Phương án miễn phí đã chọn cho backlog mở rộng

**Cập nhật 03/10 sau khi owner điền connection:** đã export production mã hóa,
580916 byte, giải mã xác thực và đọc mục lục 940 entries thành công. Có dữ liệu
bookings/profiles/menu_items/auth.users/storage.objects. Chưa restore cô lập;
không coi mục lục là chứng minh ứng dụng/Supabase Auth khôi phục được.

Trên Windows PowerShell 7 / Node 24, dùng `scripts/run-database-backup.ps1`
với `-ToolsDirectory` trỏ bin PostgreSQL portable và `-CertificatePath` trỏ CA
download từ Database Settings của Supabase. Wrapper nạp `.env.local`, bảo vệ
khóa bằng Windows CurrentUser DPAPI và lưu archive ngoài Git ở
`LocalAppData/MocViBackups`; key file nằm riêng `LocalAppData/MocViBackupKeys`.
Không sao chép key hoặc archive vào repository/OneDrive source/chat. CA được
truyền qua PGSSLROOTCERT, không tắt xác minh certificate hoặc hostname.

DPAPI hiện phụ thuộc Windows user/máy: **chưa có phương án key recovery ngoài
máy được kiểm chứng**. Không xóa key, mất key không giải mã được archive. Cần
diễn tập restore local và phương án off-site/key recovery trước nghiệm thu DR.

Export logical database bằng `pg_dump --format=custom`, mã hóa AES-256-GCM
trước khi ghi file `.mocvi.enc` ngoài repository. Không ghi plaintext SQL vào
đĩa, không đưa credentials vào command arguments hoặc log. Công cụ:
`scripts/database-backup.mjs`; test guard: `pnpm test:backup`.

Cấu hình riêng trong môi trường shell được bảo vệ (script không tự đọc `.env`):
`DATABASE_BACKUP_URL` là direct/session connection của project đã xác minh;
`DATABASE_BACKUP_PROJECT_REF=unhybmmbgumyhzaftlli`; `PG_TOOLS_DIR` là thư mục
client PostgreSQL tin cậy, phiên bản không cũ hơn server; `DATABASE_BACKUP_KEY`
là 32 byte ngẫu nhiên dạng 64 hex. Giữ key riêng với archive và có bản sao key
được owner quản lý; mất key đồng nghĩa không giải mã được. Không sử dụng anon
key hoặc service-role key thay mật khẩu PostgreSQL.

`node scripts/database-backup.mjs export ABSOLUTE_FILE.mocvi.enc` không ghi đè
file cũ. Giới hạn archive 256 MiB và thời gian 180 giây; vượt giới hạn là FAIL,
không backup một phần. Kết nối cloud xác minh TLS và project ref, không dùng
transaction pooler 6543. Một bản sao mã hóa thứ hai ở thiết bị/vị trí riêng vẫn
cần owner lựa chọn; file trên cùng máy không phải off-site backup.

Restore chỉ qua `restore-local`, `TEST_DATABASE_URL` loopback database trống
tên `mocvi_test_*`; kiểm chứng authentication tag trước khi gọi `pg_restore`,
single transaction và dừng khi lỗi. Không có clean/drop/reset hoặc restore cloud.
Supabase roles/extensions có thể cần bootstrap tương thích riêng; nếu thiếu,
restore phải FAIL, không bỏ ACL để giả PASS. Sau restore cần đối chiếu schema,
grants, counts và invariants với nguồn; output RESTORED không phải nghiệm thu DR.

Scope archive là PostgreSQL database: không chứa file Storage, cloud settings,
SMTP, secret của dịch vụ hoặc cấu hình Vercel. Supabase Auth schema trong dump
không tự chứng minh Auth service chạy được sau khôi phục. Storage objects cần
backup riêng khi bắt đầu upload. Tham khảo:
[Supabase backups](https://supabase.com/docs/guides/platform/backups).

Ghi nhận đầu ngày 03/10 (trước cập nhật export ở trên): test mã hóa/guard đã chạy; chưa có PostgreSQL backup credentials
hoặc pg_dump/pg_restore trên máy nên export/restore production **NOT RUN**.
Không đổi password database để lấy kết nối. RPO/RTO và retention chưa được owner
xác nhận; không tự đặt giá trị hoặc chứng nhận disaster recovery PASS.

Kiểm tra read-only ngày 03/10/2026 tại dashboard của project
`unhybmmbgumyhzaftlli` (hiển thị `mocvi-development`): **Free Plan không bao gồm
project backups**. Dashboard không cung cấp bản backup scheduled để restore.
Chưa xuất dữ liệu production và chưa thực hiện restore production hoặc diễn tập
restore cô lập. Đây là khoảng trống vận hành thực tế, không phải backup PASS.
Owner phải xác nhận trong dashboard/plan hiện tại hoặc với nhà cung cấp: retention,
backup gần nhất, phạm vi backup, quyền restore và chi phí.

Diễn tập an toàn trên database cô lập:

1. Tạo database/project development riêng, không trỏ runtime production vào đó.
2. Lưu backup ở nơi được kiểm soát; không đưa file vào repo, `artifacts/` hoặc chat.
3. Restore vào database cô lập, ghi thời điểm và source backup.
4. Đối chiếu schema/migration, catalogue, constraints, grants/RLS, RPC, audit và scheduler.
5. Chạy `pnpm test:db` trên database loopback mới, trống khác với database vừa
   restore; runner này không nhận database đã có dữ liệu. Smoke server trỏ riêng
   vào database phục hồi và tắt tác vụ gửi email/SMS/payment/scheduler.
6. Kiểm tra route public, guest guard và dữ liệu live read-only.
7. Ghi chênh lệch, thời gian restore và cách khôi phục; không dùng database này làm
   production nếu chưa có approval riêng.

Restore production chỉ thực hiện sau khi xác định mốc khôi phục, ảnh hưởng booking/
audit, cửa sổ bảo trì và người duyệt. Rollback code không tự hoàn nguyên schema.

## Rollback

### Rollback code

1. Xác định commit cuối cùng đã PASS CI/Vercel.
2. Tạo commit revert rõ ràng trên nhánh hiện tại hoặc dùng rollback deployment được
   Vercel hỗ trợ; không force push.
3. Chờ CI/Vercel PASS rồi smoke lại các route public.

### Rollback database

Không checkout đè migration hoặc chạy lệnh xóa dữ liệu. Đối chiếu schema, audit và
booking trước khi chọn migration sửa/additive hoặc restore cô lập. Thao tác production
cần operator có quyền và evidence before/after.

## Người phụ trách bàn giao

Các vai trò dưới đây chưa được gán tên trong repository; điền trước khi vận hành thật:

| Vai trò | Người phụ trách |
| --- | --- |
| Product/đồ án owner | `[CHƯA GÁN]` |
| Repository và deploy | `[CHƯA GÁN]` |
| Supabase/database operator | `[CHƯA GÁN]` |
| Người duyệt migration/quyền | `[CHƯA GÁN]` |
| Người xử lý sự cố | `[CHƯA GÁN]` |

## Checklist release

- [ ] Đúng branch/commit đã push; không có `.env`, secret, backup, build output,
      fixture hoặc asset 3D ngoài phạm vi trong staged diff.
- [ ] `pnpm install --frozen-lockfile`, typecheck và lint đạt.
- [ ] Contract/SQL tests chạy trên database cô lập; kết quả lưu theo SHA.
- [ ] Normal build và Pages build chạy tuần tự; basePath/asset/link đạt.
- [ ] CI quality job PASS; Pages deploy PASS nếu public thay đổi.
- [ ] Vercel deployment/check PASS đúng SHA.
- [ ] Smoke read-only Vercel/Pages đạt; không có route public 4xx/5xx bất thường.
- [ ] Auth/booking live mutation chỉ chạy khi có QA fixture và approval riêng.
- [ ] Migration/scheduler được đối chiếu; không có failed run chưa xử lý.
- [ ] Backup/restore status đã xác minh, hoặc ghi rõ `NOT VERIFIED`.
- [ ] Người phụ trách đã được điền và biết đường rollback.

## Kết luận readiness

Scope mở rộng ngày 03/10 được theo dõi ở [completion-backlog.md](completion-backlog.md).
Recovery production đã phát hành nhưng email callback vẫn chưa nghiệm thu do
người dùng gặp lỗi rồi rate limit. Không resend lặp lại để lấy PASS. Combo live
đang được kiểm thử local, flag `COMBO_CATALOGUE_ENABLED` không tự bật khi deploy.
Chỉ bật sau migration và kiểm tra khôi phục/before-after theo backlog. Tắt flag
giữ UI tham khảo, không xóa bảng, audit hoặc dữ liệu để rollback.

Phần 10 đạt **PARTIAL — sẵn sàng demo và vận hành thử có kiểm soát** khi các
checklist code/CI/deployment và hướng dẫn đã PASS. Chưa công bố production
operational readiness đầy đủ tới khi backup/restore, người phụ trách và cửa sổ
rollback được owner xác minh. Các giới hạn sản phẩm gồm callback email production,
role UI production, đổi tầng bàn, combo CRUD, reset password, email/SMS,
order/payment, analytics, multi-branch và 3D vẫn giữ nguyên.
