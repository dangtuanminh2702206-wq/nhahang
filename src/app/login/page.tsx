import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { IdentityForm } from "@/components/identity-form";
import { IdentityNotice } from "@/components/identity-notice";
import { getSupabaseConfig } from "@/lib/supabase/config";
export const metadata: Metadata = { title: "Đăng nhập", robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ confirmation?: string }> }) {
  const demo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
  if (!demo) await connection();
  const confirmationFailed = !demo && (await searchParams).confirmation === "failed";
  return <section className="section"><div className="site-container identity-container"><p className="eyebrow">Tài khoản Mộc Vị</p><h1>Đăng nhập.</h1><p className="lead">Sử dụng email đã được xác nhận để truy cập hồ sơ.</p>{confirmationFailed && <p role="alert">Liên kết xác nhận không hợp lệ, đã hết hạn hoặc dịch vụ chưa khả dụng. Vui lòng kiểm tra email và mở liên kết trong trình duyệt đã đăng ký.</p>}{!getSupabaseConfig() ? <IdentityNotice demo={demo} /> : <><IdentityForm mode="login" /><p className="small-note">Nếu liên kết xác nhận hết hạn hoặc không hợp lệ, hãy đăng nhập sau khi xác nhận email hoặc liên hệ người quản trị. Chưa hỗ trợ đặt lại mật khẩu trong giai đoạn này.</p><p>Chưa có tài khoản? <Link className="text-link" href="/signup">Đăng ký</Link></p></>}</div></section>;
}
