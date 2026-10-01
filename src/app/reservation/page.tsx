import type { Metadata } from "next";
import { ReservationPreview } from "@/components/reservation-preview";
export const metadata: Metadata = { title: "Đặt bàn · Preview" };
export default function ReservationPage() {
  return <><section className="page-hero reservation-hero"><div className="site-container"><p className="eyebrow">Hẹn nhau ở Mộc Vị</p><h1>Một bàn ăn.<br /><em>Một cuộc gặp.</em></h1><p className="lead">Chọn thời gian, không gian và thử xem bàn phù hợp với cuộc gặp của bạn.</p></div></section><section className="section"><div className="site-container"><ReservationPreview /></div></section></>;
}
