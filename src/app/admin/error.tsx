"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return <section className="section"><div className="site-container admin-container"><p className="eyebrow">Admin management</p><h1>Không thể tải khu vực quản trị.</h1><p className="booking-error" role="alert">Dữ liệu live chưa sẵn sàng hoặc phiên Admin đã hết hạn.</p><button className="button button-secondary" type="button" onClick={() => reset()}>Thử lại</button></div></section>;
}
