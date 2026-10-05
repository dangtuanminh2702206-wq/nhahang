import { ServiceHours } from "@/components/service-hours";
import type { Metadata } from "next";
import Link from "next/link";
import { AssetImage } from "@/components/asset-image";
import { spacesHeroMedia } from "@/data/media";
import { resolveMedia } from "@/lib/media.server";
export const metadata: Metadata = { title: "Liên hệ" };
export default function ContactPage() {
  return <><section className="page-hero"><div className="site-container"><p className="eyebrow">Ghé Mộc Vị</p><h1>Hẹn nhau,<br /><em>qua một bữa ăn.</em></h1></div></section><section className="section"><div className="site-container contact-grid"><figure><AssetImage asset={resolveMedia(spacesHeroMedia)} label="Mặt tiền Mộc Vị" sizes="(max-width: 704px) calc(100vw - 40px), 55vw" eager /></figure><div className="contact-details"><h2>Thông tin ghé thăm</h2><dl><div><dt>Giờ mở cửa</dt><dd><ServiceHours /></dd></div><div><dt>Địa chỉ</dt><dd>Chưa cung cấp</dd></div><div><dt>Điện thoại / Email</dt><dd>Chưa cung cấp</dd></div></dl><Link className="button button-primary" href="/reservation">Đặt bàn</Link></div></div></section></>;
}
