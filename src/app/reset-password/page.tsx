import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { IdentityForm } from "@/components/identity-form";
import { IdentityNotice } from "@/components/identity-notice";
import { getCurrentProfile, getCurrentUser } from "@/lib/identity";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Đặt mật khẩu mới", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage() {
  const demo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
  if (!demo) await connection();
  const configured = getSupabaseConfig();
  const user = configured ? await getCurrentUser() : null;
  const profile = user ? await getCurrentProfile() : null;
  return <section className="section"><div className="site-container identity-container">
    <p className="eyebrow">Tài khoản Mộc Vị</p><h1>Đặt mật khẩu mới.</h1>
    {!configured ? <IdentityNotice demo={demo} /> : !user || !profile?.is_active ? <>
      <p>Hãy mở liên kết khôi phục hợp lệ để xác nhận tài khoản trước khi đặt mật khẩu mới.</p>
      <Link className="text-link" href="/forgot-password">Yêu cầu liên kết khôi phục</Link>
    </> : <>
      <p className="lead">Đổi mật khẩu cho {user.email}. Sau khi hoàn tất, hãy đăng nhập lại trên các thiết bị của bạn.</p>
      <IdentityForm mode="reset-password" />
    </>}
    <p><Link className="text-link" href="/login">Trở về đăng nhập</Link></p>
  </div></section>;
}
