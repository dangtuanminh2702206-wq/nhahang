"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";

const navigation = [
  { href: "/", label: "Trang chủ" },
  { href: "/spaces", label: "Không gian" },
  { href: "/menu", label: "Thực đơn" },
  { href: "/#booking", label: "Đặt bàn" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : href !== "/#booking" && pathname.startsWith(href);

  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <Link className="wordmark" href="/" aria-label={`${siteConfig.name} · Trang chủ`}>
          <span aria-hidden="true" className="wordmark-mark">M</span>
          <span>{siteConfig.name}</span>
        </Link>
        <nav className="desktop-nav" aria-label="Điều hướng chính">
          {navigation.map((item) => <Link key={item.href} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined} className={isCurrent(item.href) ? "is-current" : undefined}>{item.label}</Link>)}
        </nav>
        <details className="mobile-nav">
          <summary aria-label="Mở điều hướng">Menu</summary>
          <nav aria-label="Điều hướng di động">
            {navigation.map((item) => <Link key={item.href} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined} className={isCurrent(item.href) ? "is-current" : undefined}>{item.label}</Link>)}
          </nav>
        </details>
      </div>
    </header>
  );
}
