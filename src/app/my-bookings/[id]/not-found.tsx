import Link from "next/link";

export default function NotFound() {
  return <section className="section"><div className="site-container booking-container"><p className="eyebrow">Đặt bàn</p><h1>Không tìm thấy đặt bàn.</h1><p className="lead">Đặt bàn này không tồn tại hoặc không thuộc tài khoản hiện tại.</p><Link className="button button-secondary" href="/my-bookings">Quay lại danh sách</Link></div></section>;
}
