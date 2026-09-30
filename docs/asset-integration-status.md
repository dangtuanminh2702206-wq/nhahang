# Phase 3B.1 · Incremental asset integration

Nguồn duy nhất: `moc-vi-ai-assets-ACCEPTED-PARTIAL.zip` (15.134.254 bytes), được gửi từ Downloads. Đã kiểm tra nội dung thật sau giải nén, đọc `README.md`, `QA-STATUS.md`, `asset-status.json`, đối chiếu toàn bộ cây `public/images/` với danh sách accepted và so SHA-256 từng file sau copy. Các WebP được giữ nguyên tên, folder và bytes; không recompress.

## Trạng thái hiện tại

| Nhóm | Đã có / mục tiêu | UI |
| --- | ---: | --- |
| Restaurant / architecture | 16 / 16 | Toàn bộ đã có placement |
| Menu dishes | 20 / 30 | Đủ 30 món, 10 ảnh dùng fallback |
| Combo final | 0 / 4 | Đủ 4 combo, ảnh dùng fallback |
| Tổng | 36 / 50 | 14 asset pending, không phải lỗi build |

`src/data/media.ts` chứa expected path, alt, ratio và object-position. Catalogue món/bàn vẫn ở `src/data/restaurant.ts`; mã và tọa độ bàn không thay đổi. `src/lib/media.server.ts` kiểm tra file ở server/build và truyền trạng thái available/pending cho UI. `AssetImage` dùng `next/image` chỉ khi file có thật, với fallback cho lỗi tải; file pending không được đưa vào `src` nên không phát sinh request 404.

Ảnh pending và ảnh món tạm hết là hai trạng thái độc lập: thiếu ảnh không làm món thành unavailable.

## Restaurant assets đã tích hợp

Tất cả path dưới đây tính từ project root.

| Path | Placement | Ratio |
| --- | --- | --- |
| `public/images/restaurant/hero/moc-vi-hero.webp` | Home hero, preload duy nhất | 4:5 |
| `public/images/restaurant/exterior/moc-vi-exterior.webp` | Home giới thiệu | 16:9 |
| `public/images/restaurant/floors/floor-1-moc-gia.webp` | Home, Spaces, detail tầng 1 | 4:3 |
| `public/images/restaurant/floors/floor-2-moc-tinh.webp` | Home, Spaces, detail tầng 2 | 4:3 |
| `public/images/restaurant/floors/floor-3-moc-thuong.webp` | Home, Spaces, detail tầng 3 | 4:3 |
| `public/images/restaurant/areas/family.webp` | Gallery tầng 1 | 3:2 |
| `public/images/restaurant/areas/quiet.webp` | Gallery tầng 2 | 3:2 |
| `public/images/restaurant/areas/rooftop.webp` | Gallery tầng 3 | 3:2 |
| `public/images/restaurant/areas/vip.webp` | Gallery tầng 3 | 3:2 |
| `public/images/restaurant/isometric/floor-1.webp` | Detail tầng 1 | 4:3 |
| `public/images/restaurant/isometric/floor-2.webp` | Detail tầng 2 | 4:3 |
| `public/images/restaurant/isometric/floor-3.webp` | Detail tầng 3 | 4:3 |
| `public/images/restaurant/tables/couple.webp` | Gallery tầng 1 | 3:2 |
| `public/images/restaurant/tables/family.webp` | Gallery tầng 1 | 3:2 |
| `public/images/restaurant/tables/group.webp` | Gallery tầng 2 | 3:2 |
| `public/images/restaurant/tables/vip.webp` | Gallery tầng 3 | 3:2 |

Tất cả là ảnh AI minh họa concept. Isometric và table scenes không xác định vị trí/mã bàn; HTML/CSS FloorPlan vẫn là mô hình tương tác chính thức.

## 20 ảnh món accepted

Đã tích hợp ảnh cho toàn bộ 5 món Khai vị, 5 Món Việt đặc sắc, 5 món chính MV-MC01…MV-MC05, 2 lẩu MV-LA01…MV-LA02, 2 tráng miệng MV-TM01…MV-TM02 và Trà sen MV-DU01. Tất cả có tỷ lệ 4:3, 1200×900px và path riêng theo mapping. Home dùng cùng mapping cho featured dishes.

## 10 món pending

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

## 4 combo final pending

| Mã | Combo | Expected path |
| --- | --- | --- |
| MV-CB01 | Mộc Duyên | `public/images/menu/combos/moc-duyen.webp` |
| MV-CB02 | Mộc Gia | `public/images/menu/combos/moc-gia.webp` |
| MV-CB03 | Mộc Tĩnh | `public/images/menu/combos/moc-tinh.webp` |
| MV-CB04 | Mộc Thượng | `public/images/menu/combos/moc-thuong.webp` |

## Tiếp tục Phase 3B.2

1. Kiểm tra QA pack tiếp theo và copy chỉ file accepted vào đúng expected path.
2. Không cần sửa menu data hoặc cờ trạng thái. Production dùng static rendering nên cần build/deploy lại; trong development, tải lại route để kiểm tra file mới.
3. Kiểm tra crop và tỷ lệ của 14 ảnh mới, cập nhật object-position nếu nội dung cần.
4. Chạy typecheck, lint, build và kiểm tra responsive.

Không sử dụng ảnh Internet, ảnh thay thế từ món khác hoặc combo first-pass chưa đạt QA.

## Kiểm tra Phase 3B.1

- SHA-256: cả 36 file copy giống nguyên bản trong ZIP.
- Chrome headless: 6 routes (`/`, `/spaces`, 3 tầng, `/menu`) × 4 viewport (320, 704, 1024, 1440px), tổng 24 lượt đều đạt; không horizontal overflow.
- Đã mở toàn bộ category: đủ 30 món (20 ảnh + 10 fallback), 4 combo fallback; cả 36 asset accepted có placement được kiểm tra.
- Không request ảnh pending; không HTTP 4xx/5xx hoặc console/page error trong luồng tải bình thường. Cố tình chặn tải Hero cũng chuyển sang fallback, không giữ broken image.
- Accessibility cơ bản: một main và h1 mỗi trang, alt có nghĩa, tabs hỗ trợ phím mũi tên/Home/End, chọn bàn bằng Enter vẫn hoạt động với 8/8/6 bàn.
- Đã xem ảnh chụp Home, Menu và tầng 3 trên mobile/desktop; giữ tỷ lệ ảnh gốc để không cắt mất món/kiến trúc. Skill UI/UX chỉ hướng dẫn reserved geometry, sizes và responsive, không đổi design system.
- Favicon chưa có asset được duyệt: dùng empty icon metadata để tránh request `/favicon.ico` mặc định, không tạo ảnh ngoài ZIP.
- Typecheck, lint và production build đều đạt.
- Smoke test bản production (`next start`): cả 6 routes tải được, không console error/HTTP lỗi trong luồng bình thường; fallback Hero vẫn hoạt động khi chặn request ảnh.

## File thay đổi

- Assets: 36 WebP trong `public/images/restaurant/` và `public/images/menu/dishes/`.
- Mới: `src/data/media.ts`, `src/lib/media.server.ts`, `src/components/asset-image.tsx`, tài liệu trạng thái này.
- UI: `src/app/page.tsx`, `src/app/menu/page.tsx`, `src/app/spaces/page.tsx`, `src/app/spaces/[slug]/page.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/menu-browser.tsx`, `src/components/media-placeholder.tsx`.
- Tài liệu: `README.md`, `docs/asset-manifest.md`, `docs/architecture.md`.
- Không thêm dependency; không đổi `src/data/restaurant.ts`, `src/components/floor-plan.tsx` hoặc `supabase/`.
