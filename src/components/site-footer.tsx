import Link from "next/link";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-grid">
        <div>
          <p className="wordmark"><span aria-hidden="true" className="wordmark-mark">M</span><span>{siteConfig.name}</span></p>
          <p className="footer-note">Bối cảnh giả định cho đồ án Kỹ thuật phần mềm ứng dụng.</p>
        </div>
        <nav aria-label="Điều hướng chân trang" className="footer-nav">
          <Link href="/spaces">Không gian</Link>
          <Link href="/menu">Thực đơn</Link>
          <Link href="/#booking">Đặt bàn</Link>
        </nav>
      </div>
    </footer>
  );
}
