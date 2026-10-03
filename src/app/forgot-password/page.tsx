import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { IdentityForm } from "@/components/identity-form";
import { IdentityNotice } from "@/components/identity-notice";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Quên mật khẩu", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ recovery?: string; reason?: string }> }) {
  const demo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
  if (!demo) await connection();
  const query = demo ? {} : await searchParams;
  const failed = query.recovery === "failed";
  const messages: Record<string,string> = {
    browser: "Không tìm thấy xác nhận của trình duyệt đã yêu cầu khôi phục. Gửi yêu cầu mới, rồi mở thư mới nhất trong chính trình duyệt đó; không dùng cửa sổ ẩn danh hoặc đổi thiết bị.",
    expired: "Liên kết đã hết hạn hoặc đã được dùng. Chỉ mở thư mới nhất một lần; không quay lại link cũ sau khi đã xác nhận.",
    account: "Đã nhận liên kết nhưng tài khoản chưa có hồ sơ active hợp lệ. Liên hệ người quản trị; gửi lại email không khắc phục được trạng thái tài khoản.",
    service: "Chưa thể hoàn tất xác nhận với dịch vụ tài khoản. Vui lòng báo thông báo này cho người quản trị trước khi yêu cầu nhiều thư mới.",
    invalid: "Liên kết không chứa thông tin khôi phục hợp lệ. Hãy mở nút khôi phục trong email mới nhất.",
  };
  return <section className="section"><div className="site-container identity-container">
    <p className="eyebrow">Tài khoản Mộc Vị</p><h1>Quên mật khẩu.</h1>
    <p className="lead">Nhận liên kết khôi phục qua email của bạn.</p>
    {failed && <p role="alert">{messages[query.reason ?? ""] ?? "Liên kết không hợp lệ, đã hết hạn hoặc tài khoản chưa được phép truy cập. Hãy mở thư mới nhất trong cùng trình duyệt đã gửi yêu cầu."}</p>}
    {!getSupabaseConfig() ? <IdentityNotice demo={demo} /> : <IdentityForm mode="forgot-password" />}
    <p><Link className="text-link" href="/login">Trở về đăng nhập</Link></p>
  </div></section>;
}
