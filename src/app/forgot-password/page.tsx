import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { IdentityForm } from "@/components/identity-form";
import { IdentityNotice } from "@/components/identity-notice";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Quên mật khẩu", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ recovery?: string }> }) {
  const demo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
  if (!demo) await connection();
  const failed = !demo && (await searchParams).recovery === "failed";
  return <section className="section"><div className="site-container identity-container">
    <p className="eyebrow">Tài khoản Mộc Vị</p><h1>Quên mật khẩu.</h1>
    <p className="lead">Nhận liên kết khôi phục qua email của bạn.</p>
    {failed && <p role="alert">Liên kết không hợp lệ, đã hết hạn hoặc tài khoản chưa được phép truy cập. Bạn có thể yêu cầu liên kết mới; hãy mở trong cùng trình duyệt đã gửi yêu cầu.</p>}
    {!getSupabaseConfig() ? <IdentityNotice demo={demo} /> : <IdentityForm mode="forgot-password" />}
    <p><Link className="text-link" href="/login">Trở về đăng nhập</Link></p>
  </div></section>;
}
