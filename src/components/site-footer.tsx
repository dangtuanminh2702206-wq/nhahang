import { ServiceHours } from "@/components/service-hours";
import Link from "next/link";
import { bookingMutationsEnabled } from "@/lib/booking";
export function SiteFooter() {
  const bookingEnabled = bookingMutationsEnabled();
  return <footer className="site-footer"><div className="site-container"><div className="footer-grid"><div><Link className="footer-brand" href="/">Mộc Vị</Link><p className="footer-note">Ẩm thực Việt đương đại.<br />Một bàn ăn, nhiều câu chuyện.</p></div><nav className="footer-nav" aria-label="Điều hướng chân trang"><Link href="/menu">Thực đơn</Link><Link href="/spaces">Không gian</Link><Link href="/reservation">Đặt bàn</Link><Link href="/contact">Liên hệ</Link></nav><div><p className="eyebrow">Giờ mở cửa</p><p><ServiceHours /></p></div></div><div className="footer-bottom"><p>Mộc Vị Restaurant</p><p>{bookingEnabled ? "Yêu cầu đặt bàn cần nhà hàng xác nhận" : "Bản xem trước không nhận yêu cầu đặt bàn."}</p></div></div></footer>;
}
