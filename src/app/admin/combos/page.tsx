import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ComboAdmin } from "@/components/combo-admin";
import type { ComboRecord } from "@/lib/combo-types";
import { liveCombosEnabled } from "@/lib/combos.server";
import { requireRole, IdentityError } from "@/lib/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {title:"Quản lý combo",robots:{index:false,follow:false}};
export default async function ComboAdminPage() {
  if(process.env.NEXT_PUBLIC_STATIC_DEMO==="true") return <section className="section"><div className="site-container"><h1>Quản lý combo trên bản Vercel.</h1><p>Pages chỉ hiển thị catalogue snapshot.</p><Link href="/">Về trang chính</Link></div></section>;
  await connection();
  try {await requireRole(["admin"]);} catch(error) {
    if(error instanceof IdentityError && error.status===401) redirect("/login");
    return <section className="section"><div className="site-container"><h1>Chưa thể truy cập quản lý combo.</h1><p role="alert">Cần phiên Admin active và kết nối dịch vụ tài khoản.</p></div></section>;
  }
  let snapshot: {combos:ComboRecord[];menuOptions:{code:string;name:string}[]} | null = null;
  const enabled = liveCombosEnabled();
  if(enabled) {
    try {
      const db=await createSupabaseServerClient();
      const [combos,menu]=await Promise.all([db.from("menu_combos").select("*").order("sort_order").order("code").limit(501),db.from("menu_items").select("code,name").eq("is_active",true).order("code").limit(1001)]);
      if(combos.error || menu.error || !combos.data || !menu.data || combos.data.length>500 || menu.data.length>1000) throw new Error("COMBO_QUERY_FAILED");
      snapshot={combos:(combos.data as ComboRecord[]).map(row=>({...row,price:Number(row.price)})),menuOptions:menu.data};
    } catch {snapshot=null;}
  }
  const content = !enabled ? <p role="status">Combo live chưa được bật. Cần kiểm thử migration và xác minh khôi phục trước khi bật trên môi trường này.</p> : snapshot ? <ComboAdmin {...snapshot} /> : <p className="booking-error" role="alert">Chưa thể tải catalogue combo live. Không dùng snapshot để sửa dữ liệu; kiểm tra migration và thử lại.</p>;
  return <section className="section"><div className="site-container admin-container"><p className="eyebrow">Admin management</p><h1>Quản lý combo.</h1><p className="lead">Chỉnh sửa có lý do, kiểm tra phiên bản và audit. Ẩn combo thay vì xóa lịch sử.</p><Link className="text-link" href="/admin">Về quản trị hệ thống</Link>{content}</div></section>;
}
