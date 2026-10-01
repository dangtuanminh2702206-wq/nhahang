import type { Metadata } from "next";
import { SpaceStories } from "@/components/space-stories";
export const metadata: Metadata = { title: "Không gian" };
export default function SpacesPage() {
  return <><section className="page-hero"><div className="site-container"><p className="eyebrow">Không gian Mộc Vị</p><h1>Ba tầng.<br /><em>Ba cách để ngồi lại.</em></h1><p className="lead">Gần gũi ở Mộc Gia, chậm rãi ở Mộc Tĩnh, thoáng đãng ở Mộc Thượng. Cùng một tinh thần, một nhịp riêng cho mỗi cuộc gặp.</p><p className="small-note">Ảnh AI minh họa concept · Sơ đồ tương tác xác định mã bàn và sức chứa cấu hình.</p></div></section><section className="section"><div className="site-container"><SpaceStories eagerFirst /></div></section></>;
}
