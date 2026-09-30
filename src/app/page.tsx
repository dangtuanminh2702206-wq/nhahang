import Link from "next/link";
import { AssetImage } from "@/components/asset-image";
import { getMenuImage, restaurantMedia } from "@/data/media";
import { featuredMenuItems, formatPrice, menuCombos, restaurantFloors } from "@/data/restaurant";
import { resolveMedia } from "@/lib/media.server";

export default function Home() {
  return (
    <>
      <section className="hero-section">
        <div className="site-container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Ẩm thực Việt đương đại · Bối cảnh đồ án</p>
            <h1>Những bữa ăn để chậm lại và gần nhau hơn.</h1>
            <p className="lead">Mộc Vị là không gian nhà hàng giả định cho đồ án: ẩm thực Việt hiện đại, ba tầng với những nhịp gặp gỡ khác nhau.</p>
            <div className="action-row">
              <Link className="button button-primary" href="#booking">Đặt bàn</Link>
              <Link className="button button-secondary" href="/spaces">Khám phá không gian</Link>
            </div>
          </div>
          <AssetImage asset={resolveMedia(restaurantMedia.hero)} label="Không gian chủ đạo của Mộc Vị" className="hero-media" kind="hero" sizes="(max-width: 704px) calc(100vw - 32px), (max-width: 1024px) 512px, 460px" preload />
        </div>
      </section>

      <section className="section intro-section">
        <div className="site-container intro-grid">
          <div className="intro-copy">
            <p className="eyebrow">Về Mộc Vị</p>
            <h2>Một thế giới mô phỏng, được thiết kế như một trải nghiệm thật.</h2>
            <p>Mộc Vị Restaurant là bối cảnh giả định của đồ án Kỹ thuật phần mềm ứng dụng. Concept kết hợp vật liệu gỗ ấm, sắc kem, xanh olive dịu và cách phục vụ ẩm thực Việt đương đại. Không gian và hình ảnh được tạo để minh họa cho đồ án, không đại diện cho cơ sở kinh doanh thật.</p>
          </div>
          <figure>
            <AssetImage asset={resolveMedia(restaurantMedia.exterior)} label="Mặt tiền Mộc Vị" sizes="(max-width: 704px) calc(100vw - 32px), (max-width: 1024px) 48vw, 550px" />
            <figcaption>Mặt tiền giả định · Minh họa AI</figcaption>
          </figure>
        </div>
      </section>

      <section className="section section-tint">
        <div className="site-container">
          <div className="section-heading">
            <div><p className="eyebrow">Ba tầng, ba nhịp điệu</p><h2>Chọn một không gian phù hợp với cuộc gặp.</h2></div>
            <Link className="text-link" href="/spaces">Xem toàn bộ không gian <span aria-hidden="true">→</span></Link>
          </div>
          <div className="space-grid">
            {restaurantFloors.map((floor) => (
              <article className="space-card" key={floor.slug}>
                <AssetImage asset={resolveMedia(restaurantMedia[floor.slug])} label={`Tầng ${floor.level} · ${floor.name}`} sizes="(max-width: 704px) calc(100vw - 32px), (max-width: 1024px) 46vw, 384px" />
                <div className="space-card-copy">
                  <p className="meta-line">Tầng {floor.level} · {floor.tables.length} bàn · {floor.tables.reduce((total, table) => total + table.capacity, 0)} chỗ</p>
                  <h3>{floor.name}</h3><p>{floor.description}</p>
                  <Link className="text-link" href={`/spaces/${floor.slug}`}>Xem tầng {floor.level} <span aria-hidden="true">→</span></Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="site-container">
          <div className="section-heading">
            <div><p className="eyebrow">Món nổi bật</p><h2>Những lựa chọn được giới thiệu trong catalogue.</h2></div>
            <Link className="text-link" href="/menu">Xem thực đơn <span aria-hidden="true">→</span></Link>
          </div>
          <div className="featured-menu-grid">
            {featuredMenuItems.map((item) => (
              <article className="featured-menu-item" key={item.code}>
                <AssetImage asset={resolveMedia(getMenuImage(item.code, item.name))} label={item.name} kind="dish" sizes="(max-width: 704px) 112px, (max-width: 1024px) 44vw, 368px" />
                <div><p className="meta-line">{item.code}</p><h3>{item.name}</h3><strong className="price">{formatPrice(item.price, item.fromPrice)}</strong></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="site-container">
          <div className="section-heading">
            <div><p className="eyebrow">Combo gợi ý</p><h2>Một điểm bắt đầu theo số người cùng bàn.</h2></div>
            <p className="section-note">Combo là nội dung tham khảo theo số khách cùng dùng bữa.</p>
          </div>
          <div className="home-combo-grid">
            {menuCombos.map((combo) => (
              <article className="home-combo-card" key={combo.code}>
                <AssetImage asset={resolveMedia(getMenuImage(combo.code, combo.name, "combo"))} label={combo.name} kind="combo" sizes="(max-width: 704px) calc(100vw - 72px), (max-width: 1024px) 42vw, 260px" />
                <p className="meta-line">{combo.guestCount} người · {combo.code}</p>
                <h3>{combo.name}</h3><p>{combo.description}</p>
                <strong className="price">{formatPrice(combo.price)}</strong>
                <Link className="text-link" href="/menu">Xem thực đơn <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="booking" className="booking-cta section">
        <div className="site-container booking-cta-inner">
          <div><p className="eyebrow">Phần tiếp theo</p><h2>Sẵn sàng chọn bàn cho buổi gặp của bạn?</h2><p>Luồng đặt bàn đầy đủ sẽ được triển khai ở giai đoạn nghiệp vụ tiếp theo. Hiện tại, hãy khám phá sơ đồ và sức chứa của từng tầng.</p></div>
          <Link className="button button-primary" href="/spaces">Xem sơ đồ bàn</Link>
        </div>
      </section>
    </>
  );
}
