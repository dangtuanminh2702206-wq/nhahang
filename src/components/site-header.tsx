"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";

const navigation = [
  { href: "/", label: "Trang chủ" },
  { href: "/spaces", label: "Không gian" },
  { href: "/menu", label: "Thực đơn" },
  { href: "/contact", label: "Liên hệ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <Link className="wordmark" href="/" aria-label={`${siteConfig.name} · Trang chủ`}>
          <span className="brand-name">Mộc Vị<span>RESTAURANT</span></span>
        </Link>
        <nav className="desktop-nav" aria-label="Điều hướng chính">
          {navigation.map((item) => <Link key={item.href} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined} className={isCurrent(item.href) ? "is-current" : undefined}>{item.label}</Link>)}
        </nav>
        <Link className="button button-primary header-booking" href="/reservation" aria-current={pathname === "/reservation" ? "page" : undefined}>Đặt bàn ↗</Link>
        {/* Native disclosure can be opened before React hydrates. Keep its browser-owned state. */}
        <details className="mobile-nav" suppressHydrationWarning>
          <summary aria-label="Mở điều hướng">Menu</summary>
          <nav aria-label="Điều hướng di động">
            {navigation.map((item) => <Link key={item.href} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined} className={isCurrent(item.href) ? "is-current" : undefined}>{item.label}</Link>)}
            <Link href="/reservation">Đặt bàn · Preview</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
