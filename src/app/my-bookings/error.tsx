"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="section"><div className="site-container booking-container"><p className="eyebrow">Chưa thể tải dữ liệu</p><h1>Đặt bàn của tôi.</h1><p className="booking-error" role="alert">Dịch vụ đặt bàn tạm thời chưa khả dụng. Không có thay đổi nào được thực hiện.</p><button className="button button-secondary" type="button" onClick={reset}>Thử lại</button></div></section>;
}
