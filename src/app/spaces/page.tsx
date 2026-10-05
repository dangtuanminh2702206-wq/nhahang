import { connection } from "next/server";
import { getLiveFloors } from "@/lib/spaces-live";
import type { Metadata } from "next";
import { SpaceStories } from "@/components/space-stories";
import { AssetImage } from "@/components/asset-image";
import { spacesHeroMedia } from "@/data/media";
import { resolveMedia } from "@/lib/media.server";
import styles from "./spaces.module.css";
export const metadata: Metadata = { title: "Không gian" };
export default async function SpacesPage() {
  if (process.env.NEXT_PUBLIC_STATIC_DEMO !== "true") await connection();
  const floors = await getLiveFloors();
  if (!floors) return <p role="alert">Chưa thể tải không gian. Vui lòng thử lại sau.</p>;
  return <>
    <section className="page-hero">
      <div className={`site-container ${styles.hero}`}>
        <div className={styles.copy}>
          <p className="eyebrow">Không gian Mộc Vị</p>
          <h1>Ba tầng.<br /><em>Ba cách để ngồi lại.</em></h1>
          <p className="lead">Gần gũi ở Mộc Gia, chậm rãi ở Mộc Tĩnh, thoáng đãng ở Mộc Thượng. Cùng một tinh thần, một nhịp riêng cho mỗi cuộc gặp.</p>
        </div>
        <AssetImage
          asset={resolveMedia(spacesHeroMedia)}
          label="Mặt tiền Mộc Vị"
          className={styles.image}
          sizes="(max-width: 1023px) calc(100vw - 40px), (max-width: 1440px) 36vw, 480px"
          preload
        />
      </div>
    </section>
    <section className="section"><div className="site-container"><SpaceStories eagerFirst floors={floors} /></div></section>
  </>;
}
