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
      <section className="page-hero"><div className="site-container narrow-copy"><p className="eyebrow">Catalogue mô phỏng</p><h1>Thực đơn cho những bữa ăn quây quần.</h1><p className="lead">30 món và 4 combo dưới đây là catalogue chuẩn của thế giới giả định Mộc Vị. Giá và nội dung chỉ phục vụ cho đồ án.</p></div></section>
      <div className="section menu-page"><div className="site-container"><MenuBrowser media={media} /></div></div>
    </>
  );
}
