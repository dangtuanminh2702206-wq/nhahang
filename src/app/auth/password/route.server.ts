import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getApplicationOrigin } from "@/lib/supabase/origin";
import { IdentityError, requireActiveUser } from "@/lib/identity";

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== getApplicationOrigin(request) || request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return reply({ message: "Yêu cầu không hợp lệ." }, 403);
  }
  if (!getSupabaseConfig()) return reply({ message: "Dịch vụ tài khoản chưa được cấu hình." }, 503);
  try {
    const text = await request.text();
    if (text.length > 2048) return reply({ message: "Dữ liệu quá dài." }, 413);
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ message: "Dữ liệu không hợp lệ." }, 400);
    const fields = body as Record<string, unknown>;
    const requestReset = fields.action === "forgot-password";
    const updatePassword = fields.action === "reset-password";
    if ((!requestReset && !updatePassword) || Object.keys(fields).some(key => !(requestReset ? ["action", "email"] : ["action", "password", "password_confirmation"]).includes(key))) {
      return reply({ message: "Thao tác không hợp lệ." }, 400);
    }
    const supabase = await createSupabaseServerClient();
    if (requestReset) {
      if (typeof fields.email !== "string" || fields.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
        return reply({ message: "Nhập email hợp lệ." }, 400);
      }
      const { error } = await supabase.auth.resetPasswordForEmail(fields.email.trim(), {
        redirectTo: new URL("/auth/recovery", getApplicationOrigin(request)).href,
      });
      // Provider rate limits remain enforced. Never reveal whether the email exists.
      if (error?.status === 429 || ["over_email_send_rate_limit", "over_request_rate_limit"].includes(error?.code || "")) {
        return reply({ message: "Đã đạt giới hạn gửi email. Vui lòng chờ rồi thử lại." }, 429);
      }
      if (error?.status === 401 || error?.code === "email_address_not_authorized") return reply({ message: "Dịch vụ email chưa được cấu hình để gửi thư khôi phục. Vui lòng liên hệ người quản trị." }, 503);
      if (error && (!error.status || error.status >= 500)) return reply({ message: "Dịch vụ email tạm thời chưa khả dụng. Vui lòng thử lại sau." }, 503);
      return reply({ message: "Nếu tài khoản có thể khôi phục, bạn sẽ nhận được email hướng dẫn. Mở liên kết trong cùng trình duyệt đã gửi yêu cầu và kiểm tra cả thư rác." });
    }
    await requireActiveUser();
    if (typeof fields.password !== "string" || fields.password.length < 8 || fields.password.length > 128 || fields.password !== fields.password_confirmation) {
      return reply({ message: "Mật khẩu từ 8 đến 128 ký tự; hai lần nhập phải giống nhau." }, 400);
    }
    const { error } = await supabase.auth.updateUser({ password: fields.password });
    if (error) return reply({ message: "Chưa thể đổi mật khẩu. Liên kết hoặc phiên có thể đã hết hạn; mật khẩu cũng cần đáp ứng yêu cầu của dịch vụ tài khoản." }, error.status === 429 ? 429 : error.status && error.status < 500 ? 400 : 503);
    // Revoke refresh tokens for all sessions. Already-issued JWTs retain their original expiry.
    const { error: logoutError } = await supabase.auth.signOut({ scope: "global" });
    if (logoutError) {
      return reply({ updated: true, message: "Mật khẩu đã đổi, nhưng chưa thể xác nhận đăng xuất mọi phiên. Hãy đăng xuất và liên hệ người quản trị nếu cần thu hồi phiên." });
    }
    return reply({ updated: true, redirect: "/login?password=updated" });
  } catch (error) {
    if (error instanceof IdentityError) return reply({ message: "Phiên khôi phục đã hết hạn hoặc tài khoản chưa được phép truy cập. Hãy yêu cầu liên kết mới." }, error.status);
    if (error instanceof SyntaxError) return reply({ message: "Dữ liệu không hợp lệ." }, 400);
    return reply({ message: "Dịch vụ tài khoản tạm thời chưa khả dụng. Vui lòng thử lại sau." }, 503);
  }
}
