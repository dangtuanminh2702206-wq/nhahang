import "server-only";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function bookingMutationsEnabled() {
  const config = getSupabaseConfig();
  if (!config) return false;
  const applicationUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!applicationUrl) return false;
  let applicationHost: string;
  let supabaseHost: string;
  try {
    applicationHost = new URL(applicationUrl).hostname;
    supabaseHost = new URL(config.url).hostname;
  } catch {
    return false;
  }
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(applicationHost);
  if (!isLocal) {
    // Production is explicitly opted in and pinned to the approved site/project.
    return process.env.BOOKING_MUTATIONS_ENABLED === "true"
      && new URL(applicationUrl).origin === "https://moc-vi-restaurant.vercel.app"
      && process.env.BOOKING_ALLOWED_SUPABASE_PROJECT_REF === "unhybmmbgumyhzaftlli"
      && new URL(config.url).origin === "https://unhybmmbgumyhzaftlli.supabase.co";
  }
  if (process.env.BOOKING_LOCAL_MUTATIONS_ENABLED !== "true") return false;

  // Cloud mutations are allowed only for the explicitly isolated Phase 5 project.
  // Production/current projects remain fail-closed even if the flag is misconfigured.
  if (["localhost", "127.0.0.1", "[::1]"].includes(supabaseHost)) return true;
  const phase5ProjectRef = "ojnkruytzhfqathvlexh";
  return process.env.BOOKING_ALLOWED_SUPABASE_PROJECT_REF === phase5ProjectRef
    && supabaseHost === `${phase5ProjectRef}.supabase.co`
    && process.env.VERCEL !== "1";
}

export function bookingError(error: { code?: string; message?: string }) {
  if (error.code === "23P01") return { status: 409, message: "Bàn vừa hết chỗ hoặc lịch của bạn bị trùng. Hãy kiểm tra bàn lại." };
  const messages: Record<string, string> = {
    MIN_NOTICE: "Thời gian quá gần. Vui lòng chọn thời gian muộn hơn.",
    MAX_ADVANCE: "Ngày đặt vượt giới hạn cho phép của nhà hàng.",
    OUTSIDE_BUSINESS_HOURS: "Thời gian này ngoài khung phục vụ hoặc thuộc ngày nghỉ.",
    INVALID_CAPACITY: "Số khách không phù hợp với sức chứa hoặc chính sách nhà hàng.",
    TABLE_UNAVAILABLE: "Bàn này không nhận đặt chỗ. Hãy kiểm tra bàn lại.",
    CUSTOMER_BOOKING_LIMIT: "Bạn đã đạt giới hạn đặt bàn đang hoạt động.",
    IDEMPOTENCY_PAYLOAD_MISMATCH: "Lần thử lại không khớp yêu cầu trước. Vui lòng kiểm tra lựa chọn.",
    INVALID_INPUT: "Thông tin đặt bàn không hợp lệ.",
  };
  if (error.message && messages[error.message]) return { status: error.message === "IDEMPOTENCY_PAYLOAD_MISMATCH" ? 409 : 422, message: messages[error.message] };
  if (error.code === "42501") return { status: 403, message: "Tài khoản không có quyền thực hiện yêu cầu này." };
  return { status: 503, message: "Dịch vụ đặt bàn chưa sẵn sàng. Không có xác nhận giữ bàn; nếu vừa gửi yêu cầu, hãy thử lại với cùng thông tin." };
}
