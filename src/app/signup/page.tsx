import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { IdentityForm } from "@/components/identity-form";
import { IdentityNotice } from "@/components/identity-notice";
import { getSupabaseConfig } from "@/lib/supabase/config";
export const metadata: Metadata = { title: "Đăng ký", robots: { index: false, follow: false } };
export default async function SignupPage() {
  const demo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
  if (!demo) await connection();
  return <section className="section"><div className="site-container identity-container"><p className="eyebrow">Tài khoản Mộc Vị</p><h1>Đăng ký.</h1><p className="lead">Tài khoản mới có vai trò Customer. Bạn cần xác nhận email trước khi đăng nhập.</p>{!getSupabaseConfig() ? <IdentityNotice demo={demo} /> : <><IdentityForm mode="signup" /><p>Đã có tài khoản? <Link className="text-link" href="/login">Đăng nhập</Link></p></>}</div></section>;
}
