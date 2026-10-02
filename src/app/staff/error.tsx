"use client";

export default function StaffError({ retry }: { retry: () => void }) {
  return <section className="section"><div className="site-container staff-container"><h1>Chưa thể tải dữ liệu.</h1><p role="alert">Kết nối vận hành tạm thời gặp lỗi. Không có thao tác nào được xác nhận từ màn hình này.</p><button className="button button-secondary" type="button" onClick={retry}>Thử tải lại</button></div></section>;
}
