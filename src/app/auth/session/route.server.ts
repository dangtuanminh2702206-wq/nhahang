import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getApplicationOrigin } from "@/lib/supabase/origin";
import { getCurrentProfile, getCurrentUser, IdentityError, requireActiveUser } from "@/lib/identity";

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  if (!getSupabaseConfig()) return reply({ authenticated: false, configured: false });
  try {
    const user = await getCurrentUser();
    const profile = user ? await getCurrentProfile() : null;
    return reply({ configured: true, authenticated: !!user, active: !!profile?.is_active });
  } catch { return reply({ message: "Chưa thể xác minh phiên đăng nhập. Vui lòng thử lại." }, 503); }
}

export async function POST(request: NextRequest) {
  // Same-origin JSON only: never mutate via a cross-site form or GET request.
  if (request.headers.get("origin") !== getApplicationOrigin(request) || !request.headers.get("content-type")?.startsWith("application/json")) {
    return reply({ message: "Yêu cầu không hợp lệ." }, 403);
  }
  if (!getSupabaseConfig()) return reply({ message: "Đăng nhập chưa được cấu hình trên máy chủ này." }, 503);
  try {
    const text = await request.text();
    if (text.length > 8192) return reply({ message: "Dữ liệu quá dài." }, 413);
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ message: "Dữ liệu không hợp lệ." }, 400);
    const fields = body as Record<string, unknown>;
    const supabase = await createSupabaseServerClient();
    if (fields.action === "logout") {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      return error ? reply({ message: "Chưa thể đăng xuất. Vui lòng thử lại." }, 503) : reply({ redirect: "/login" });
    }
    if (fields.action === "profile") {
      const { user } = await requireActiveUser();
      if (Object.keys(fields).some(key => !["action", "full_name", "phone"].includes(key))) return reply({ message: "Không được thay đổi quyền hoặc trạng thái tài khoản." }, 400);
      if (typeof fields.full_name !== "string" || !fields.full_name.trim() || fields.full_name.trim().length > 120 || typeof fields.phone !== "string" || fields.phone.trim().length > 32) {
        return reply({ message: "Tên phải có 1–120 ký tự; điện thoại tối đa 32 ký tự." }, 400);
      }
      const { data, error } = await supabase.from("profiles").update({ full_name: fields.full_name.trim(), phone: fields.phone.trim() || null }).eq("id", user.id).select("id").maybeSingle();
      if (error || !data) return reply({ message: "Không thể cập nhật hồ sơ. Vui lòng kiểm tra quyền và thử lại." }, 403);
      return reply({ message: "Đã cập nhật hồ sơ." });
    }
    if (fields.action !== "login" && fields.action !== "signup") return reply({ message: "Thao tác không hợp lệ." }, 400);
    if (typeof fields.email !== "string" || fields.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()) || typeof fields.password !== "string" || fields.password.length < 8 || fields.password.length > 128) {
      return reply({ message: "Nhập email hợp lệ và mật khẩu từ 8 đến 128 ký tự." }, 400);
    }
    const email = fields.email.trim();
    const password = fields.password;
    if (fields.action === "signup") {
      const origin = getApplicationOrigin(request);
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: new URL("/auth/confirm", origin).href } });
      if (error) return reply({ message: "Chưa thể đăng ký. Kiểm tra thông tin hoặc thử lại sau." }, 400);
      if (data.session) {
        await supabase.auth.signOut({ scope: "local" });
        return reply({ message: "Máy chủ cần bật xác nhận email trước khi sử dụng đăng ký." }, 503);
      }
      // Do not reveal whether an email already exists; signup cannot assign a role.
      return reply({ message: "Nếu email có thể đăng ký, bạn sẽ nhận được thư xác nhận. Vui lòng kiểm tra hộp thư và thư rác." });
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user?.email_confirmed_at) {
      if (data.session) await supabase.auth.signOut({ scope: "local" });
      return reply({ message: "Email, mật khẩu chưa đúng hoặc email chưa được xác nhận." }, 401);
    }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("id,role,is_active").eq("id", data.user.id).maybeSingle();
    if (profileError || !profile?.is_active || !["customer", "staff", "admin"].includes(profile.role)) {
      await supabase.auth.signOut({ scope: "local" });
      return reply({ message: "Tài khoản chưa được phép truy cập. Vui lòng liên hệ người quản trị." }, 403);
    }
    return reply({ redirect: "/profile" });
  } catch (error) {
    if (error instanceof IdentityError) return reply({ message: "Bạn chưa đăng nhập hoặc chưa được phép thực hiện thao tác này." }, error.status);
    if (error instanceof SyntaxError) return reply({ message: "Dữ liệu không hợp lệ." }, 400);
    return reply({ message: "Dịch vụ tài khoản tạm thời chưa khả dụng. Vui lòng thử lại." }, 503);
  }
}
