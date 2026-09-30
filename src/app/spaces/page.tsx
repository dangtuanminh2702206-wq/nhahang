import type { Metadata } from "next";
import Link from "next/link";
import { AssetImage } from "@/components/asset-image";
import { restaurantMedia } from "@/data/media";
import { restaurantFloors } from "@/data/restaurant";
import { resolveMedia } from "@/lib/media.server";

export const metadata: Metadata = { title: "Không gian", description: "Khám phá ba tầng không gian mô phỏng của Mộc Vị Restaurant." };

export default function SpacesPage() {
  return (
    <>
      <section className="page-hero">
        <div className="site-container narrow-copy">
          <p className="eyebrow">Không gian mô phỏng</p><h1>Ba tầng, mỗi tầng một cách để ngồi lại.</h1>
          <p className="lead">Từ khu đón khách sáng và ấm đến rooftop thoáng, mỗi tầng mang một sắc thái riêng cho những cuộc gặp.</p>
        </div>
      </section>
      <section className="section">
        <div className="site-container spaces-list">
          {restaurantFloors.map((floor) => (
            <article className="floor-feature" key={floor.slug}>
              <AssetImage asset={resolveMedia(restaurantMedia[floor.slug])} label={`Tầng ${floor.level} · ${floor.name}`} sizes="(max-width: 704px) calc(100vw - 32px), (max-width: 1280px) 50vw, 604px" eager={floor.level === 1} />
              <div className="floor-feature-copy">
                <p className="eyebrow">Tầng {floor.level} · {floor.tables.length} bàn · {floor.tables.reduce((sum, table) => sum + table.capacity, 0)} chỗ</p>
                <h2>{floor.name}</h2><p>{floor.description}</p>
                <ul className="feature-list">{floor.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                <Link className="button button-secondary" href={`/spaces/${floor.slug}`}>Xem sơ đồ tầng {floor.level}</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
