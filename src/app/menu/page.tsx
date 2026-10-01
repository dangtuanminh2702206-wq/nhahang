import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu-browser";
import { getMenuImage } from "@/data/media";
import { menuCombos, restaurantMenu } from "@/data/restaurant";
import { resolveMedia } from "@/lib/media.server";
export const metadata: Metadata = { title: "Thực đơn", description: "Catalogue 30 món và 4 combo mô phỏng của Mộc Vị Restaurant." };
export default function MenuPage() {
  const media = {
    dishes: Object.fromEntries(restaurantMenu.map((item) => [item.code, resolveMedia(getMenuImage(item.code, item.name))])),
    combos: Object.fromEntries(menuCombos.map((combo) => [combo.code, resolveMedia(getMenuImage(combo.code, combo.name, "combo"))])),
  };
  return (
    <>
      <section className="page-hero"><div className="site-container"><p className="eyebrow">Từ bếp Mộc Vị</p><h1>Vị quen.<br /><em>Ăn cùng nhau.</em></h1><p className="lead">30 món Việt và 4 combo gợi ý. Từ một món khai vị nhẹ đến những món dùng chung cho cả bàn.</p><p className="small-note">Catalogue mô phỏng cho đồ án · Giá tham khảo · Ảnh còn thiếu được ghi rõ.</p></div></section>
      <div className="section menu-page"><div className="site-container"><MenuBrowser media={media} /></div></div>
    </>
  );
}
