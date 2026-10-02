import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { CustomerNotifications } from "@/components/customer-notifications";
import { bookingStatusLabel, canCustomerCancel, formatBookingDate, getCustomerBookings, getCustomerNotifications } from "@/lib/customer-bookings";
import { IdentityError, requireRole } from "@/lib/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Đặt bàn của tôi", robots: { index: false, follow: false } };

export default async function MyBookingsPage() {
  const demo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
  if (demo) return <section className="section"><div className="site-container booking-container"><p className="eyebrow">Tài khoản Mộc Vị</p><h1>Đặt bàn của tôi.</h1><p className="lead">Bản GitHub Pages chỉ là demo tĩnh. Hãy dùng bản chính thức để đăng nhập và xem đặt bàn cá nhân.</p><Link className="button button-secondary" href="/reservation">Xem trang đặt bàn</Link></div></section>;
  await connection();
  let identity;
  try { identity = await requireRole(["customer"]); }
  catch (error) {
    if (error instanceof IdentityError && error.status === 401) redirect("/login");
    if (error instanceof IdentityError && error.status === 403) return <section className="section"><div className="site-container booking-container"><p className="eyebrow">Tài khoản Customer</p><h1>Đặt bàn của tôi.</h1><p className="booking-error" role="alert">Chỉ tài khoản Customer mới có thể xem đặt bàn cá nhân.</p></div></section>;
    throw error;
  }
  const supabase = await createSupabaseServerClient();
  const [bookings, notifications] = await Promise.all([getCustomerBookings(supabase, identity.user.id), getCustomerNotifications(supabase, identity.user.id)]);
  return <section className="section"><div className="site-container booking-container"><div className="section-heading"><div><p className="eyebrow">Tài khoản Customer</p><h1>Đặt bàn của tôi.</h1></div><Link className="back-link" href="/reservation">Đặt bàn mới ↗</Link></div><section className="booking-section" aria-labelledby="booking-list-title"><div className="booking-section-heading"><div><p className="eyebrow">Lịch sử cá nhân</p><h2 id="booking-list-title">Những cuộc hẹn sắp tới.</h2></div><p className="section-note">Chỉ bạn có thể xem các đặt bàn này. Trạng thái cuối cùng do nhà hàng xác nhận.</p></div>{bookings.length ? <div className="booking-list">{bookings.map((booking) => <article className="booking-row" key={booking.id}><div className="booking-row-main"><p className="meta-line">{booking.table ? `Bàn ${booking.table.code} · ${booking.table.capacity} chỗ` : "Bàn đang cập nhật"}</p><h3>{formatBookingDate(booking.starts_at)}</h3><p>{booking.guest_count} khách · <span className={`status status-${booking.status}`}>{bookingStatusLabel(booking.status)}</span></p></div><div className="booking-row-action"><Link className="text-link" href={`/my-bookings/${booking.id}`}>Chi tiết</Link>{booking.status !== "cancelled" && <CancelBookingButton bookingId={booking.id} disabled={!canCustomerCancel(booking)} />}</div></article>)}</div> : <div className="empty-state"><h3>Bạn chưa có đặt bàn nào.</h3><p>Chọn một thời gian phù hợp để bắt đầu cuộc hẹn ở Mộc Vị.</p><Link className="button button-primary" href="/reservation">Đặt bàn</Link></div>}</section><section className="booking-section" aria-labelledby="notification-title"><div className="booking-section-heading"><div><p className="eyebrow">Thông báo trong site</p><h2 id="notification-title">Cập nhật đặt bàn.</h2></div><p className="section-note">Thông báo chỉ là bản ghi nội bộ, không gửi email hay SMS.</p></div><CustomerNotifications initialItems={notifications} /></section></div></section>;
}
