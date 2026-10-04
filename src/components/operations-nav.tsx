"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function OperationsNav({ area }: { area: "staff" | "admin" }) {
  const pathname = usePathname();
  const links = area === "admin"
    ? [{ href: "/admin", label: "Quản trị hệ thống" }, { href: "/admin/combos", label: "Quản lý combo" }, { href: "/staff", label: "Vận hành nhà hàng" }]
    : [{ href: "/staff", label: "Tổng quan vận hành" }, { href: "/staff#staff-bookings-title", label: "Danh sách booking" }, { href: "/staff#staff-create-title", label: "Tạo booking" }, { href: "/staff#staff-tables-title", label: "Trạng thái bàn" }];

  return <nav aria-label="Điều hướng khu vực vận hành" className="operations-nav">
    <span className="operations-brand">Mộc Vị <span>Workspace</span></span>
    <div>{links.map(({ href, label }) => <Link key={href} href={href}
      aria-current={(href === "/staff" ? pathname.startsWith(href) : pathname === href) ? "page" : undefined}>{label}</Link>)}</div>
  </nav>;
}
