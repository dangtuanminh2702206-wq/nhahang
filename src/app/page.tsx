import { siteConfig } from "@/config/site";

export default function Home() {
  return (
    <div className="page-shell">
      <header className="site-header">
        <p className="wordmark">{siteConfig.name}</p>
        <p className="project-status">Nền móng dự án</p>
      </header>

      <main className="hero" id="main-content">
        <p className="eyebrow">Website quản lý và đặt bàn trực tuyến</p>
        <h1>Một trải nghiệm đặt bàn rõ ràng cho khách và nhà hàng.</h1>
        <p className="intro">
          Nền tảng đang được xây dựng dựa trên đặc tả nghiệp vụ đã thống nhất,
          với trọng tâm là tính nhất quán, khả năng tiếp cận và vận hành ổn định.
        </p>

        <section aria-labelledby="foundation-heading" className="foundation">
          <h2 id="foundation-heading">Phạm vi hiện tại</h2>
          <p>
            Cấu trúc Next.js, TypeScript, Tailwind CSS và tài liệu kiến trúc đã
            sẵn sàng cho giai đoạn thiết kế cơ sở dữ liệu.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <p>{siteConfig.name} · Đồ án Kỹ thuật phần mềm ứng dụng</p>
      </footer>
    </div>
  );
}
