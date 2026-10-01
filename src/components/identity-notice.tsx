import Link from "next/link";
export function IdentityNotice({ demo = false }: { demo?: boolean }) {
  return <aside className="demo-notice"><strong>{demo ? "Bản demo tĩnh không hỗ trợ đăng nhập." : "Dịch vụ tài khoản chưa được cấu hình."}</strong><p>{demo ? "Đăng ký, đăng nhập và hồ sơ chỉ hoạt động trên bản Next.js server. Trang này không kết nối Supabase và không nhận thông tin tài khoản." : "Cần cấu hình Supabase development trước khi sử dụng. Không nhập thông tin tài khoản trên bản chưa cấu hình."}</p><Link className="text-link" href="/">Về trang chủ</Link></aside>;
}
