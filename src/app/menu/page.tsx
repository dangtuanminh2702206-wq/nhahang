import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu-browser";
import { getMenuImage } from "@/data/media";
import { getLiveCombos } from "@/lib/combos.server";
import { resolveMedia } from "@/lib/media.server";
import { getLiveMenu } from "@/lib/menu-live";
import { connection } from "next/server";
export const metadata: Metadata = { title: "Thực đơn", description: "Catalogue 30 món và 4 combo mô phỏng của Mộc Vị Restaurant." };
export default async function MenuPage() {
  if (process.env.NEXT_PUBLIC_STATIC_DEMO !== "true") await connection();
  const liveMenu = await getLiveMenu();
  const combos = await getLiveCombos();
  const menuCombos = combos.items;
  if (liveMenu.mode === "error") return <section className="section"><div className="site-container"><p className="eyebrow">Thực đơn</p><h1>Thực đơn đang được cập nhật.</h1><p className="booking-error" role="alert">Chưa thể đọc dữ liệu live từ Supabase. Vui lòng thử lại sau; catalogue snapshot không được dùng để giả làm dữ liệu online.</p></div></section>;
  const restaurantMenu = liveMenu.items;
  const media = {
    dishes: Object.fromEntries(restaurantMenu.map((item) => {
      const asset = getMenuImage(item.code, item.name);
      return [item.code, resolveMedia(item.imagePath ? { ...asset, path: item.imagePath } : asset)];
    })),
    combos: Object.fromEntries(menuCombos.map((combo) => {
      const asset = getMenuImage(combo.code, combo.name, "combo");
      return [combo.code, resolveMedia(combo.imagePath ? {...asset,path:combo.imagePath} : combos.mode === "live" ? {...asset,path:"/images/menu/combos/pending.webp"} : asset)];
    })),
  };
  return (
    <>
      <section className="page-hero"><div className="site-container"><p className="eyebrow">Từ bếp Mộc Vị</p><h1>Vị quen.<br /><em>Ăn cùng nhau.</em></h1><p className="lead">{restaurantMenu.length} món Việt và {menuCombos.length} combo gợi ý. Từ một món khai vị nhẹ đến những món dùng chung cho cả bàn.</p><p className="small-note">Catalogue mô phỏng cho đồ án · Giá tham khảo · Ảnh minh họa AI.</p>{combos.mode === "snapshot" && <p className="small-note">Combo từ catalogue tham khảo, chưa đồng bộ database.</p>}{combos.mode === "error" && <p role="alert">Chưa thể tải combo live. Không dùng combo snapshot thay thế.</p>}</div></section>
      <div className="section menu-page"><div className="site-container"><MenuBrowser media={media} items={restaurantMenu} combos={menuCombos} categories={liveMenu.categories} /></div></div>
    </>
  );
}
