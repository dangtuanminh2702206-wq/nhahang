import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu-browser";
import { getMenuImage } from "@/data/media";
import { menuCombos } from "@/data/restaurant";
import { resolveMedia } from "@/lib/media.server";
import { getLiveMenu } from "@/lib/menu-live";
import { connection } from "next/server";
export const metadata: Metadata = { title: "Thực đơn", description: "Catalogue 30 món và 4 combo mô phỏng của Mộc Vị Restaurant." };
export default async function MenuPage() {
  if (process.env.NEXT_PUBLIC_STATIC_DEMO !== "true") await connection();
  const liveMenu = await getLiveMenu();
  if (liveMenu.mode === "error") return <section className="section"><div className="site-container"><p className="eyebrow">Thực đơn</p><h1>Thực đơn đang được cập nhật.</h1><p className="booking-error" role="alert">Chưa thể đọc dữ liệu live từ Supabase. Vui lòng thử lại sau; catalogue snapshot không được dùng để giả làm dữ liệu online.</p></div></section>;
  const restaurantMenu = liveMenu.items;
  const media = {
    dishes: Object.fromEntries(restaurantMenu.map((item) => {
      const asset = getMenuImage(item.code, item.name);
      return [item.code, resolveMedia(item.imagePath ? { ...asset, path: item.imagePath } : asset)];
    })),
    combos: Object.fromEntries(menuCombos.map((combo) => [combo.code, resolveMedia(getMenuImage(combo.code, combo.name, "combo"))])),
  };
  return (
    <>
      <section className="page-hero"><div className="site-container"><p className="eyebrow">Từ bếp Mộc Vị</p><h1>Vị quen.<br /><em>Ăn cùng nhau.</em></h1><p className="lead">30 món Việt và 4 combo gợi ý. Từ một món khai vị nhẹ đến những món dùng chung cho cả bàn.</p><p className="small-note">Catalogue mô phỏng cho đồ án · Giá tham khảo · Ảnh minh họa AI.</p></div></section>
      <div className="section menu-page"><div className="site-container"><MenuBrowser media={media} items={restaurantMenu} categories={liveMenu.categories} /></div></div>
    </>
  );
}
