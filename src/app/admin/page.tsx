import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/admin-console";
import { getAdminSnapshot } from "@/lib/admin";
import { IdentityError, requireRole } from "@/lib/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Quản trị hệ thống", robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{ from?: string; to?: string }> };

function datePart(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

export default async function AdminPage({ searchParams }: Props) {
  if (process.env.NEXT_PUBLIC_STATIC_DEMO === "true") return <section className="section"><div className="site-container admin-container"><p className="eyebrow">Admin management</p><h1>Bản quản trị chạy trên Vercel.</h1><p className="lead">GitHub Pages chỉ là snapshot tĩnh. Đăng nhập Admin trên bản Vercel để xem dữ liệu Supabase.</p><Link className="button button-secondary" href="/">Về trang chính</Link></div></section>;
  await connection();
  try {
    await requireRole(["admin"]);
  } catch (error) {
    if (error instanceof IdentityError && error.status === 401) redirect("/login");
    if (error instanceof IdentityError && error.status === 403) return <section className="section"><div className="site-container admin-container"><p className="eyebrow">Admin management</p><h1>Không có quyền truy cập.</h1><p className="booking-error" role="alert">Chỉ tài khoản Admin active mới có thể sử dụng khu vực này.</p><Link className="text-link" href="/staff">Về vận hành Staff</Link></div></section>;
    throw error;
  }
  const query = await searchParams;
  const today = datePart(new Date());
  const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from ?? "") ? query.from as string : today;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(query.to ?? "") ? query.to as string : today;
  const rangeFrom = `${from}T00:00:00+07:00`;
  const rangeTo = `${to}T00:00:00+07:00` === rangeFrom ? `${to}T23:59:59.999+07:00` : `${to}T23:59:59.999+07:00`;
  let snapshot;
  try { snapshot = await getAdminSnapshot(await createSupabaseServerClient(), { from: rangeFrom, to: rangeTo }); } catch {
    return <section className="section"><div className="site-container admin-container"><p className="eyebrow">Admin management</p><h1>Chưa thể tải dữ liệu quản trị.</h1><p className="booking-error" role="alert">Kiểm tra migration Phần 8, phiên Admin và kết nối Supabase. Không dùng dữ liệu snapshot cũ để thay thế dữ liệu live.</p><Link className="text-link" href="/staff">Về vận hành Staff</Link></div></section>;
  }
  return <AdminConsole snapshot={snapshot} range={{ from, to }} />;
}
