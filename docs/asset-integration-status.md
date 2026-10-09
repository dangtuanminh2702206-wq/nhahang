# Phần 3 · FINAL assets và spatial FloorPlan

Nguồn chính thức hiện tại: `moc-vi-ai-assets-FINAL.zip`. Đã giải nén vào thư mục
tạm, đọc đầy đủ README/QA-STATUS/asset-status.json và scan filesystem thực tế:
16 restaurant, 30 dishes, 4 combos, đúng 50 WebP. Cả 50 được giải mã pixel bằng
sharp có sẵn trong Next.js; không zero byte. Copy và đối chiếu SHA-256 từng file
giống nguồn FINAL; không regenerate, đổi tên, recompress hoặc lấy ảnh Internet.
36 file cũ có bytes giống FINAL; 14 file mới bổ sung đúng mapping đã có.

## Trạng thái hiện tại

### Độ nét sơ đồ bàn — 09/10/2026

- Cập nhật tiếp tầng 1 bằng PNG mới người dùng duyệt (1448×1086), SHA-256
  `b98457fcbfbeb9a1a4002b4528cf5ea22e98f51814fa8f899aaa4d14a6901aad`.
  Copy nguyên bytes, không nén hoặc sửa pixel; 8 mã bàn/sức chứa và vị trí
  tương ứng giữ nguyên. Tầng 2/3 không thay ảnh. Table-plan contract, Pages
  build/browser (320/704/1024/1600px, chọn bàn/keyboard/fallback) PASS sau thay
  ảnh; SHA-256 bản export khớp nguồn. Chưa commit/push lần thay ảnh mới này.

- Ba PNG sơ đồ giữ nguyên bytes nguồn người dùng: tầng 1 1448×1086, tầng 2
  1671×941, tầng 3 1292×1218. Không regenerate/upscale/sharpen ảnh hoặc đổi hotspot.
- FloorPlan dùng Next/Image `unoptimized` riêng cho sơ đồ để không nén mất chữ/
  chi tiết; canvas không vượt chiều rộng gốc, giữ tỷ lệ và vùng cuộn mobile.
  Lazy loading và fallback khi ảnh lỗi vẫn giữ. Đổi lại mỗi ảnh tải khoảng
  2,4–2,8 MB; ảnh gốc không có thêm chi tiết khi zoom trên màn hình mật độ cao.
- Typecheck/lint và normal/Pages build PASS. Table-plan contract PASS; browser
  Pages cô lập PASS ở 320/704/1024/1600px: naturalWidth đúng ảnh gốc, không
  srcset nén, không kéo quá kích thước gốc, không tràn trang; 22 điểm chọn bàn,
  keyboard, query, đồng bộ lựa chọn và fallback vẫn đạt. Cơ chế hiển thị đã
  phát hành ở `e8dd90f`; kết quả này thuộc lần sửa cơ chế trước khi thay ảnh mới.

| Nhóm | Đã có / mục tiêu | UI |
| --- | ---: | --- |
| Restaurant / architecture | 16 / 16 canonical WebP | Mapping đủ; một số concept được giữ nhưng không còn hiển thị |
| Menu dishes | 30 / 30 | Mỗi mã món có một ảnh riêng |
| Combo final | 4 / 4 | Dùng ảnh FINAL, không collage/fallback cũ |
| Tổng | 50 / 50 | Không canonical asset pending |

`src/data/media.ts` là mapping duy nhất cho path, alt, ratio và object-position.
Không cần thêm mapping trùng: các path đã khớp bộ FINAL. `src/lib/media.server.ts`
resolve ở server/build; AssetImage giữ Next/Image và NEXT_PUBLIC_BASE_PATH.
MediaPlaceholder vẫn là fallback khi file hỏng/thiếu, không phải trạng thái của
50 ảnh canonical hiện tại. Hai basename family/vip lặp giữa areas và tables là
có chủ đích; 50 full paths duy nhất và đúng ngữ cảnh, không đếm basename làm asset ID.

Ảnh pending và ảnh món tạm hết là hai trạng thái độc lập: thiếu ảnh không làm món thành unavailable.

## Restaurant assets đã tích hợp

Tất cả path dưới đây tính từ project root.

| Path | Placement | Ratio |
| --- | --- | --- |
| `public/images/restaurant/hero/moc-vi-hero.webp` | Home hero, preload duy nhất | 4:5 |
| `public/images/restaurant/exterior/moc-vi-exterior.webp` | Canonical asset được giữ trong manifest; không còn dùng ở Contact/Spaces | 16:9 |
| `public/images/restaurant/floors/floor-1-moc-gia.webp` | Home, Spaces, detail tầng 1 | 4:3 |
| `public/images/restaurant/floors/floor-2-moc-tinh.webp` | Home, Spaces, detail tầng 2 | 4:3 |
| `public/images/restaurant/floors/floor-3-moc-thuong.webp` | Home, Spaces, detail tầng 3 | 4:3 |
| `public/images/restaurant/areas/family.webp` | Gallery tầng 1 | 3:2 |
| `public/images/restaurant/areas/quiet.webp` | Gallery tầng 2 | 3:2 |
| `public/images/restaurant/areas/rooftop.webp` | Gallery tầng 3 | 3:2 |
| `public/images/restaurant/areas/vip.webp` | Gallery tầng 3 | 3:2 |
| `public/images/restaurant/isometric/floor-1.webp` | Giữ trong catalogue/tệp; hiện không hiển thị ở trang tầng | 4:3 |
| `public/images/restaurant/isometric/floor-2.webp` | Giữ trong catalogue/tệp; hiện không hiển thị ở trang tầng | 4:3 |
| `public/images/restaurant/isometric/floor-3.webp` | Giữ trong catalogue/tệp; hiện không hiển thị ở trang tầng | 4:3 |
| `public/images/restaurant/tables/couple.webp` | Gallery tầng 1 | 3:2 |
| `public/images/restaurant/tables/family.webp` | Gallery tầng 1 | 3:2 |
| `public/images/restaurant/tables/group.webp` | Gallery tầng 2 | 3:2 |
| `public/images/restaurant/tables/vip.webp` | Gallery tầng 3 | 3:2 |

Contact và Spaces hiện dùng ảnh mặt tiền dọc bổ sung `public/images/restaurant/exterior/moc-vi-exterior-portrait.png` (4:5), không thuộc bộ 50 WebP canonical. Ba ảnh isometric WebP vẫn được giữ để đối chiếu nhưng không còn render trong trang tầng. Ảnh concept và gallery không xác định mã bàn; hotspot đọc mã/sức chứa từ catalogue tầng.

## Sơ đồ bàn ảnh bổ sung — 06/10/2026

Ba PNG sau được dùng làm nền cho hotspot trên trang tầng và Reservation. Chúng là
ảnh bổ sung, không cộng vào số 50 WebP canonical và không chứa nguồn dữ liệu bàn:

| Path | Kích thước | Hotspot |
| --- | ---: | ---: |
| `public/images/restaurant/table-plans/floor-1.png` | 1448 × 1086 | 8 bàn |
| `public/images/restaurant/table-plans/floor-2.png` | 1671 × 941 | 8 bàn |
| `public/images/restaurant/table-plans/floor-3.png` | 1292 × 1218 | 6 bàn |

`src/data/table-plans.ts` chỉ lưu tọa độ vùng bấm trên ảnh; identity, số chỗ và
trạng thái vẫn lấy từ `src/data/restaurant.ts`/catalogue live. Sơ đồ là lớp tương
tác phụ trợ, không nhân bản dữ liệu nghiệp vụ. `FloorPlan` đồng bộ hotspot và
select; trang tầng đưa mã đã chọn sang `/reservation` qua query. Query sai quay
về bàn đầu tiên hợp lệ. Chọn bàn không tự kiểm tra, giữ chỗ hay tạo booking.

## 20 ảnh món có sẵn trong FINAL

Đã tích hợp ảnh cho toàn bộ 5 món Khai vị, 5 Món Việt đặc sắc, 5 món chính MV-MC01…MV-MC05, 2 lẩu MV-LA01…MV-LA02, 2 tráng miệng MV-TM01…MV-TM02 và Trà sen MV-DU01. Tất cả có tỷ lệ 4:3, 1200×900px và path riêng theo mapping. Home dùng cùng mapping cho featured dishes.

## 10 ảnh món từng thiếu — đã tích hợp FINAL

| Mã | Món | Expected path |
| --- | --- | --- |
| MV-MC06 | Tôm rang thịt ba chỉ | `public/images/menu/dishes/tom-rang-thit-ba-chi.webp` |
| MV-MC07 | Rau củ theo mùa xào nấm | `public/images/menu/dishes/rau-cu-theo-mua-xao-nam.webp` |
| MV-LA03 | Lẩu gà lá é | `public/images/menu/dishes/lau-ga-la-e.webp` |
| MV-LA04 | Cá lăng om chuối đậu | `public/images/menu/dishes/ca-lang-om-chuoi-dau.webp` |
| MV-TM03 | Sữa chua nếp cẩm | `public/images/menu/dishes/sua-chua-nep-cam.webp` |
| MV-TM04 | Trái cây theo mùa | `public/images/menu/dishes/trai-cay-theo-mua.webp` |
| MV-DU02 | Trà đào cam sả | `public/images/menu/dishes/tra-dao-cam-sa.webp` |
| MV-DU03 | Nước mơ gừng | `public/images/menu/dishes/nuoc-mo-gung.webp` |
| MV-DU04 | Nước ép dứa bạc hà | `public/images/menu/dishes/nuoc-ep-dua-bac-ha.webp` |
| MV-DU05 | Nước ép theo mùa | `public/images/menu/dishes/nuoc-ep-theo-mua.webp` |

## 4 combo FINAL đã tích hợp

| Mã | Combo | Expected path |
| --- | --- | --- |
| MV-CB01 | Mộc Duyên | `public/images/menu/combos/moc-duyen.webp` |
| MV-CB02 | Mộc Gia | `public/images/menu/combos/moc-gia.webp` |
| MV-CB03 | Mộc Tĩnh | `public/images/menu/combos/moc-tinh.webp` |
| MV-CB04 | Mộc Thượng | `public/images/menu/combos/moc-thuong.webp` |

## Kiểm tra lại Phần 3

1. `node scripts/test-public-assets.mjs`: decode/mapping và spec 22 bàn/92 chỗ.
2. `PHASE3_ASSET_SOURCE_DIR` có thể trỏ cây public/images của FINAL đã giải nén để so hash.
3. Build Pages trước, `PUBLIC_CHECK_PAGES=true` kiểm tra đủ 50 asset export và basePath.
4. Build normal lại, start local; `PUBLIC_SMOKE_URL=http://127.0.0.1:3002` kiểm tra 8 route/50 asset.
5. Browser QA 320/704/1024/1600, menu đủ nhóm/combo, FloorPlan và đồng bộ reservation.

Spatial source là spec người dùng ngày 01/10/2026, triển khai trong restaurantFloors:
origin top-left; planX/planY là center theo %. Giữ code/capacity/tầng; thêm nearbyLandmarks
tham chiếu label của tầng để chuẩn bị metadata 360. Không có viewer/dependency/ảnh bàn mới.
T1-B05 anchor (49,47), T2-B05 (49,47), T3-B05 (58,52). T2-B01 (20,75) gần Góc tĩnh;
T3-B06 (78,72) giáp VIP. Isometric chỉ concept reference, không xác định vị trí bàn.

## Nghiệm thu FINAL local · 01/10/2026

| Gate | Kết quả |
| --- | --- |
| Typecheck / lint | PASS, chạy lại sau thay đổi source cuối |
| Existing booking regression | PASS, mock/local; không ghi Supabase hoặc đổi Phần 5 |
| Asset validation | PASS: 50 WebP decode pixel, SHA-256 giống FINAL, 50 path duy nhất; 16 placement restaurant, 30 dish, 4 combo |
| Spatial validation | PASS: đúng code/capacity/floor/description/coordinate và nearbyLandmarks; 8/32 + 8/34 + 6/26 = 22/92 |
| Pages build và export | PASS: 50 asset export, 8 trang public, không canonical placeholder; /nhahang basePath |
| Pages existing safety check | PASS: 450 tham chiếu href/src; không API export hoặc URL Supabase development trong browser chunks |
| Normal build / server | PASS; build normal sau Pages, start riêng tại 127.0.0.1:3002 |
| HTTP smoke | PASS: 8 trang public và 50 asset trả về thành công, không 404 |
| Responsive browser | PASS: /menu, /spaces, 3 trang tầng và /reservation × 320/704/1024/1600 = 24 lượt; không overflow toàn trang, marker ngoài canvas, landmark đè bàn hoặc ảnh lỗi đã tải |
| Menu browser | PASS: các nhóm 5/5/7/4/4/5 món và 4 combo, tất cả có ảnh riêng; Home đưa focus/selection về tab Combo |
| Interaction / accessibility | PASS: Enter chọn bàn, focus outline rõ, aria-pressed và capacity bằng chữ; chọn T3-B06 đồng bộ dropdown, dropdown T3-B04 đồng bộ marker |
| Visual / console | PASS: xem sơ đồ T1-B05, T2-B01 Góc tĩnh trên mobile, T3-B06 giáp VIP, ảnh đồ uống sau tải; không console error được ghi nhận trong phiên QA |

Home/Contact cũng kiểm tra tại 320px: không overflow hoặc canonical placeholder.
Canvas FloorPlan và thanh tab menu giữ cuộn ngang nội bộ trên mobile theo thiết kế
đã duyệt; không ép thu nhỏ marker hoặc đổi bố cục. Ảnh dùng geometry/ratio hiện có,
Next/Image vẫn tải ảnh tối ưu; skeleton lúc lazy-load không phải asset thiếu.

**Trạng thái tại 01/10: Phần 3 PASS / hoàn tất local.** Khi đó chưa commit/push/deploy,
chờ người dùng duyệt diff. Isometric chỉ concept; không có viewer 360. Đặt bàn chưa
nhận booking thật; không gọi kiểm tra khả dụng hoặc gửi form trong nghiệm thu đó.
Contact vẫn không bịa địa chỉ/phone/email/map. Không sửa Auth/DB hoặc lịch sử test.

Không sử dụng ảnh Internet, ảnh thay thế từ món khác hoặc combo first-pass chưa đạt QA.

## Nghiệm thu sơ đồ ảnh hiện hành · 06/10/2026

| Gate | Bằng chứng | Kết quả |
| --- | --- | --- |
| PNG + hotspot | `pnpm test:table-plans`: decode 3 ảnh; mã/tổng hotspot 8/8/6 = 22; kích thước và bounds đúng | PASS local |
| Canonical asset regression | `pnpm test:public-assets`: 50 WebP decode, 16/30/4 và 3 tầng/22 bàn/92 chỗ | PASS local |
| Pages export | Build `GITHUB_PAGES=true`; `PUBLIC_CHECK_PAGES=true BOOKING_CHECK_PAGES=true pnpm test:booking`: 729 href/src đúng `/nhahang`, không API export hoặc Supabase URL | PASS local |
| Vercel — hình ảnh và dữ liệu | Browser production: 3 trang tầng; ảnh PNG hiển thị; floor 1 8/32, floor 2 8/34 (B06 4, B07 6), floor 3 6/26 | PASS read-only |
| Vercel — chọn bàn | T1-B08 → Reservation preselected đúng; đổi tầng sang floor 2, click T2-B07 và chọn T2-B06 qua select đều đồng bộ hotspot/select/nhãn | PASS read-only |
| Responsive production | Ba trang tầng × 320/704/1024/1600 đo đúng viewport: không tràn ngang trang, marker ngoài canvas hoặc ảnh lỗi đã tải | PASS browser |
| Production booking fixture | Customer UI tạo/đọc lại đúng bàn/giờ/số khách; pending chặn bàn cùng slot; fixture thay thế đã hủy bởi Customer, reload cancelled; cùng slot trả bàn sẵn sàng | PASS browser/persist; không phải SQL read-back độc lập |

Chrome headless browser test mới trong CI bổ sung hydration query đúng/sai, đổi
hotspot/select hai chiều, phím Enter, xác nhận demo không gửi booking, ảnh/bounds
và 320/704/1024/1600 trên cả ba trang. [CI](https://github.com/dangtuanminh2702206-wq/nhahang/actions/runs/37473659757)
và [Pages](https://github.com/dangtuanminh2702206-wq/nhahang/actions/runs/37473659699)
đều PASS SHA `09b7bb6`; Vercel check cùng SHA success. Fixture đầu tự hết hạn khi
browser gián đoạn; đúng một fixture thay thế được user duyệt và hủy thành công.
Cả hai cancelled, không order mới hoặc DELETE history/audit; không đổi catalogue,
role, policy hoặc migration. Test browser cô lập chặn tải sơ đồ tầng 1: fallback
vẫn đủ 8 nút/landmark, Enter chọn T1-B08 và link đặt bàn đúng: PASS local; assertion
được thêm vào CI. Không fault-inject production. Console production không ghi
nhận error; Enter trên T3-B06 giữ focus và selected state.

## Kiểm tra lịch sử Phase 3B.1 — pack partial trước FINAL

- SHA-256: cả 36 file copy giống nguyên bản trong ZIP.
- Chrome headless: 6 routes (`/`, `/spaces`, 3 tầng, `/menu`) × 4 viewport (320, 704, 1024, 1440px), tổng 24 lượt đều đạt; không horizontal overflow.
- Đã mở toàn bộ category: đủ 30 món (20 ảnh + 10 fallback), 4 combo fallback; cả 36 asset accepted có placement được kiểm tra.
- Không request ảnh pending; không HTTP 4xx/5xx hoặc console/page error trong luồng tải bình thường. Cố tình chặn tải Hero cũng chuyển sang fallback, không giữ broken image.
- Accessibility cơ bản: một main và h1 mỗi trang, alt có nghĩa, tabs hỗ trợ phím mũi tên/Home/End, chọn bàn bằng Enter vẫn hoạt động với 8/8/6 bàn.
- Đã xem ảnh chụp Home, Menu và tầng 3 trên mobile/desktop; giữ tỷ lệ ảnh gốc để không cắt mất món/kiến trúc. Skill UI/UX chỉ hướng dẫn reserved geometry, sizes và responsive, không đổi design system.
- Favicon chưa có asset được duyệt: dùng empty icon metadata để tránh request `/favicon.ico` mặc định, không tạo ảnh ngoài ZIP.
- Typecheck, lint và production build đều đạt.
- Smoke test bản production (`next start`): cả 6 routes tải được, không console error/HTTP lỗi trong luồng bình thường; fallback Hero vẫn hoạt động khi chặn request ảnh.

## File thay đổi lịch sử Phase 3B.1

- Assets: 36 WebP trong `public/images/restaurant/` và `public/images/menu/dishes/`.
- Mới: `src/data/media.ts`, `src/lib/media.server.ts`, `src/components/asset-image.tsx`, tài liệu trạng thái này.
- UI: `src/app/page.tsx`, `src/app/menu/page.tsx`, `src/app/spaces/page.tsx`, `src/app/spaces/[slug]/page.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/menu-browser.tsx`, `src/components/media-placeholder.tsx`.
- Tài liệu: `README.md`, `docs/asset-manifest.md`, `docs/architecture.md`.
- Không thêm dependency; không đổi `src/data/restaurant.ts`, `src/components/floor-plan.tsx` hoặc `supabase/`.
