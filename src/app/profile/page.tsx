import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { IdentityForm } from "@/components/identity-form";
import { IdentityNotice } from "@/components/identity-notice";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { IdentityError, requireActiveUser } from "@/lib/identity";
export const metadata: Metadata = { title: "Hồ sơ", robots: { index: false, follow: false } };
export default async function ProfilePage() {
  const demo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
  if (!demo) await connection();
  if (!getSupabaseConfig()) return <section className="section"><div className="site-container identity-container"><h1>Hồ sơ.</h1><IdentityNotice demo={demo} /></div></section>;
  let identity;
  try { identity = await requireActiveUser(); }
  catch (error) {
    if (!(error instanceof IdentityError)) throw error;
    if (error.status === 401) redirect("/login");
    return <section className="section"><div className="site-container identity-container"><h1>Chưa thể truy cập hồ sơ.</h1><p role="alert">{error.status === 403 ? "Tài khoản chưa được phép truy cập hoặc hồ sơ chưa khả dụng." : "Dịch vụ tài khoản tạm thời chưa khả dụng. Vui lòng thử lại."}</p></div></section>;
  }
  return <section className="section"><div className="site-container identity-container"><p className="eyebrow">Tài khoản Mộc Vị</p><h1>Hồ sơ của bạn.</h1><p className="lead">Vai trò: {identity.profile.role}</p><IdentityForm mode="profile" profile={{ full_name: identity.profile.full_name, phone: identity.profile.phone }} /><p className="small-note">Chỉ họ tên và điện thoại được chỉnh sửa; quyền và trạng thái do người quản trị kiểm soát.</p></div></section>;
}
