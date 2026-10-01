import "server-only";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function bookingMutationsEnabled() {
  const config = getSupabaseConfig();
  if (process.env.BOOKING_LOCAL_MUTATIONS_ENABLED !== "true" || !config) return false;
  // Phase 5 cannot enable a cloud mutation even if someone accidentally sets the flag.
  return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(config.url).hostname);
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
