import { connection } from "next/server";
import { getLiveFloors } from "@/lib/spaces-live";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssetImage } from "@/components/asset-image";
import { FloorPlan } from "@/components/floor-plan";
import { floorScenes, restaurantMedia } from "@/data/media";
import { getFloor, restaurantFloors } from "@/data/restaurant";
import { resolveMedia } from "@/lib/media.server";

type FloorPageProps = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return restaurantFloors.map((floor) => ({ slug: floor.slug })); }
export async function generateMetadata({ params }: FloorPageProps): Promise<Metadata> {
  const floor = getFloor((await params).slug);
  return floor ? { title: `Tầng ${floor.level} · ${floor.name}`, description: floor.description } : {};
}

export default async function FloorPage({ params }: FloorPageProps) {
  if (process.env.NEXT_PUBLIC_STATIC_DEMO !== "true") await connection();
  const floors = await getLiveFloors();
  if (!floors) return <p role="alert">Chưa thể tải không gian. Vui lòng thử lại sau.</p>;
  const slug = (await params).slug;
  const floor = floors.find(item => item.slug === slug);
  if (!floor) notFound();
  const capacity = floor.tables.reduce((total, table) => total + table.capacity, 0);

  return (
    <>
      <section className="floor-hero">
        <div className="site-container floor-hero-grid">
          <div>
            <Link className="back-link" href="/spaces">← Tất cả không gian</Link>
            <p className="eyebrow">Tầng {floor.level} · {floor.tables.length} bàn · {capacity} chỗ</p><h1>{floor.name}</h1>
            <p className="lead">{floor.description}</p>
            <ul className="feature-list">{floor.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          </div>
          <AssetImage asset={resolveMedia(restaurantMedia[floor.slug])} label={`Tầng ${floor.level} · ${floor.name}`} sizes="(max-width: 1024px) calc(100vw - 40px), 510px" eager />
        </div>
      </section>
      <div className="section">
        <div className="site-container">
          <FloorPlan floor={floor} />
          <section className="floor-details">
            <div>
              <p className="eyebrow">Danh sách bàn</p><h2>{floor.tables.length} bàn trong {floor.name}</h2>
              <div className="table-list">
                {floor.tables.map((table) => (
                  <article key={table.code}><strong>{table.code}</strong><span>{table.capacity} chỗ</span><p>{table.position}{table.note ? ` · ${table.note}` : ""}</p></article>
                ))}
              </div>
            </div>
          </section>
          <section className="floor-scene-section" aria-labelledby="floor-scenes-heading">
            <div className="section-heading"><div><p className="eyebrow">Góc không gian</p><h2 id="floor-scenes-heading">Một vài góc nhìn của {floor.name}.</h2></div></div>
            <div className="floor-scene-grid">
              {floorScenes[floor.slug].map((scene) => (
                <figure key={scene.asset.path}>
                  <AssetImage asset={resolveMedia(scene.asset)} label={scene.title} sizes="(max-width: 704px) calc(100vw - 32px), (max-width: 1024px) 46vw, 384px" />
                  <figcaption>{scene.title}</figcaption>
                </figure>
              ))}
            </div>
          </section>
          <div className="floor-cta">
            <div><p className="eyebrow">Bước tiếp theo</p><h2>Khám phá menu trước khi chọn bàn.</h2></div>
            <Link className="button button-primary" href="/menu">Xem thực đơn</Link>
          </div>
        </div>
      </div>
    </>
  );
}
