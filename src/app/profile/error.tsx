"use client";
export default function ProfileError({ reset }: { reset: () => void }) { return <section className="section"><div className="site-container identity-container"><h1>Chưa thể tải hồ sơ.</h1><p role="alert">Vui lòng thử lại sau. Thông tin nội bộ không được hiển thị.</p><button type="button" className="button button-primary" onClick={reset}>Thử lại</button></div></section>; }
