import type { Metadata } from "next";
import Link from "next/link";
import { AssetImage } from "@/components/asset-image";
import { restaurantMedia } from "@/data/media";
import { resolveMedia } from "@/lib/media.server";
export const metadata: Metadata = { title: "Liên hệ" };
export default function ContactPage() {
  return <><section className="page-hero"><div className="site-container"><p className="eyebrow">Ghé Mộc Vị</p><h1>Hẹn nhau,<br /><em>qua một bữa ăn.</em></h1><p className="lead">Thông tin ghé thăm trong bối cảnh nhà hàng giả định của đồ án.</p></div></section><section className="section"><div className="site-container contact-grid"><figure><AssetImage asset={resolveMedia(restaurantMedia.exterior)} label="Mặt tiền Mộc Vị" sizes="(max-width: 704px) calc(100vw - 40px), 55vw" eager /><figcaption>Mặt tiền giả định · Minh họa AI, không phải vị trí thực tế.</figcaption></figure><div className="contact-details"><h2>Thông tin ghé thăm</h2><dl><div><dt>Giờ mở cửa mô phỏng</dt><dd>10:00–22:00 · Mỗi ngày</dd></div><div><dt>Địa chỉ</dt><dd>Chưa cung cấp</dd></div><div><dt>Điện thoại / Email</dt><dd>Chưa cung cấp</dd></div></dl><p className="small-note">Chưa có địa chỉ được xác nhận nên preview không hiển thị bản đồ hay chỉ đường.</p><Link className="button button-primary" href="/reservation">Xem thử luồng đặt bàn</Link></div></div></section></>;
}
