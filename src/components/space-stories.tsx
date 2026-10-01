import Link from "next/link";
import { AssetImage } from "@/components/asset-image";
import { restaurantMedia } from "@/data/media";
import { restaurantFloors } from "@/data/restaurant";
import { resolveMedia } from "@/lib/media.server";
export function SpaceStories({ eagerFirst = false }: { eagerFirst?: boolean }) {
  return <div className="space-stories">{restaurantFloors.map((floor) => <article className="space-story" key={floor.slug}><AssetImage asset={resolveMedia(restaurantMedia[floor.slug])} label={floor.name} sizes="(max-width: 704px) calc(100vw - 40px), 55vw" eager={eagerFirst && floor.level === 1} /><div className="space-story-copy"><p className="eyebrow">0{floor.level} / {floor.subtitle.split(" · ")[1]}</p><h2>{floor.name}</h2><p>{floor.description}</p><ul className="feature-list">{floor.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><p className="space-spec">{floor.tables.length} bàn · {floor.tables.reduce((sum, table) => sum + table.capacity, 0)} chỗ cấu hình</p><Link className="text-link" href={`/spaces/${floor.slug}`}>Xem không gian & sơ đồ bàn ↗</Link></div></article>)}</div>;
}
