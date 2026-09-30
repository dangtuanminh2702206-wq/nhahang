import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu-browser";
export const metadata: Metadata = { title: "Thực đơn", description: "Catalogue 30 món và 4 combo mô phỏng của Mộc Vị Restaurant." };
export default function MenuPage() { return <><section className="page-hero"><div className="site-container narrow-copy"><p className="eyebrow">Catalogue mô phỏng</p><h1>Thực đơn cho những bữa ăn quây quần.</h1><p className="lead">30 món và 4 combo dưới đây là catalogue chuẩn của thế giới giả định Mộc Vị. Giá và nội dung chỉ phục vụ cho đồ án.</p></div></section><main className="section menu-page"><div className="site-container"><MenuBrowser /></div></main></>; }
