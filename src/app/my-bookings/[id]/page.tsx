import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { bookingStatusLabel, canCustomerCancel, formatBookingDate, getCustomerBooking, getCustomerHistory } from "@/lib/customer-bookings";
import { IdentityError, requireRole } from "@/lib/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Chi tiết đặt bàn", robots: { index: false, follow: false } };

// Customer detail pages are server-only; the static demo intentionally exports no booking IDs.
export function generateStaticParams(): { id: string }[] { return [{ id: "preview" }]; }

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const demo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
  if (demo) return <section className="section"><div className="site-container booking-container"><p className="eyebrow">Tài khoản Mộc Vị</p><h1>Chi tiết đặt bàn.</h1><p className="lead">Bản GitHub Pages chỉ là demo tĩnh; dữ liệu đặt bàn cá nhân chỉ có trên bản chính thức.</p><Link className="button button-secondary" href="/reservation">Xem trang đặt bàn</Link></div></section>;
  await connection();
  let identity;
  try { identity = await requireRole(["customer"]); }
  catch (error) {
    if (error instanceof IdentityError && error.status === 401) redirect("/login");
    if (error instanceof IdentityError && error.status === 403) return <section className="section"><div className="site-container booking-container"><h1>Không có quyền truy cập.</h1><p className="booking-error" role="alert">Chỉ tài khoản Customer mới có thể xem đặt bàn cá nhân.</p></div></section>;
    throw error;
  }
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const booking = await getCustomerBooking(supabase, identity.user.id, id);
  if (!booking) notFound();
  const history = await getCustomerHistory(supabase, booking.id);
  const canCancel = canCustomerCancel(booking);
  return <section className="section"><div className="site-container booking-container"><Link className="back-link" href="/my-bookings">← Đặt bàn của tôi</Link><div className="booking-detail-heading"><div><p className="eyebrow">Chi tiết đặt bàn</p><h1>{booking.table ? `Bàn ${booking.table.code}.` : "Đặt bàn."}</h1><p className="lead">{formatBookingDate(booking.starts_at)} · {booking.guest_count} khách</p></div><span className={`status status-${booking.status}`}>{bookingStatusLabel(booking.status)}</span></div><div className="booking-detail-grid"><section className="booking-detail-section" aria-labelledby="booking-info-title"><h2 id="booking-info-title">Thông tin cuộc hẹn.</h2><dl className="booking-facts"><div><dt>Thời gian</dt><dd>{formatBookingDate(booking.starts_at)}</dd></div><div><dt>Bàn</dt><dd>{booking.table ? `${booking.table.code} · sức chứa ${booking.table.capacity}` : "Đang cập nhật"}</dd></div><div><dt>Người đặt</dt><dd>{booking.contact_name}</dd></div><div><dt>Điện thoại</dt><dd>{booking.contact_phone}</dd></div><div><dt>Ghi chú</dt><dd>{booking.notes || "Không có"}</dd></div></dl>{booking.status !== "cancelled" && <div className="booking-cancel-panel"><p>Hủy miễn phí trước giờ dùng bàn ít nhất 60 phút. Thời gian được kiểm tra lại bằng đồng hồ database khi gửi yêu cầu.</p><CancelBookingButton bookingId={booking.id} disabled={!canCancel} />{!canCancel && <p className="small-note">Đặt bàn này đã vào thời gian không thể hủy trực tuyến hoặc không còn ở trạng thái có thể hủy.</p>}</div>}</section><section className="booking-detail-section" aria-labelledby="booking-history-title"><h2 id="booking-history-title">Lịch sử trạng thái.</h2>{history.length ? <ol className="booking-history">{history.map((event) => <li key={event.id}><p className="meta-line">{formatBookingDate(event.created_at)}</p><p>{bookingStatusLabel(event.to_status)}{event.reason && ` · ${event.reason}`}</p><span>{event.source === "customer" ? "Bạn" : event.source === "staff" ? "Nhà hàng" : "Hệ thống"}</span></li>)}</ol> : <p className="empty-state">Chưa có sự kiện trạng thái.</p>}</section></div></div></section>;
}
