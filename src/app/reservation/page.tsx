import { getLiveFloors } from "@/lib/spaces-live";
import type { Metadata } from "next";
import { ReservationPreview } from "@/components/reservation-preview";
import { connection } from "next/server";
import { bookingMutationsEnabled } from "@/lib/booking";
import { Suspense } from "react";
export const metadata: Metadata = { title: "Đặt bàn" };
export default async function ReservationPage() {
  const demo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
  if (!demo) await connection();
  const floors = await getLiveFloors();
  const selectableFloors = floors?.filter(floor => floor.tables.length > 0);
  if (!selectableFloors?.length) return <p role="alert">Chưa có không gian đặt bàn khả dụng. Vui lòng thử lại sau.</p>;
  return <><section className="page-hero reservation-hero"><div className="site-container"><p className="eyebrow">Hẹn nhau ở Mộc Vị</p><h1>Một bàn ăn.<br /><em>Một cuộc gặp.</em></h1><p className="lead">Chọn thời gian, không gian và thử xem bàn phù hợp với cuộc gặp của bạn.</p></div></section><section className="section"><div className="site-container"><Suspense fallback={<p role="status">Đang tải sơ đồ đặt bàn…</p>}><ReservationPreview floors={selectableFloors} demo={demo} mutationsEnabled={!demo && bookingMutationsEnabled()} /></Suspense></div></section></>;
}
