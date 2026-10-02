import { NextRequest, NextResponse } from "next/server";
import { IdentityError, requireRole } from "@/lib/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getApplicationOrigin } from "@/lib/supabase/origin";
import { bookingError, bookingMutationsEnabled } from "@/lib/booking";
const headers = { "Cache-Control": "private, no-store" }; const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i; const actions = ["confirm", "reject", "cancel", "check_in", "no_show", "complete", "move"] as const;
export async function POST(request: NextRequest) {
  if (!bookingMutationsEnabled()) return NextResponse.json({ message: "Thao tác vận hành chưa được bật cho môi trường này." }, { status: 503, headers });
  if (request.headers.get("origin") !== getApplicationOrigin(request)) return NextResponse.json({ message: "Yêu cầu không hợp lệ." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ message: "Yêu cầu cần định dạng JSON." }, { status: 415, headers });
  try {
    await requireRole(["staff", "admin"]); const raw = await request.text(); if (raw.length > 8192) return NextResponse.json({ message: "Yêu cầu quá dài." }, { status: 413, headers }); const body: unknown = JSON.parse(raw); if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400, headers }); const fields = body as Record<string, unknown>; const id = fields.id; const action = fields.action;
    if (typeof id !== "string" || !uuid.test(id) || typeof action !== "string" || !(actions as readonly string[]).includes(action)) return NextResponse.json({ message: "Booking hoặc thao tác không hợp lệ." }, { status: 400, headers });
    const reason = typeof fields.reason === "string" ? fields.reason.trim() : ""; if (["reject", "cancel", "no_show", "move"].includes(action) && (!reason || reason.length > 500)) return NextResponse.json({ message: "Thao tác này cần lý do tối đa 500 ký tự." }, { status: 400, headers }); const actualGuestCount = fields.actualGuestCount === undefined || fields.actualGuestCount === null ? null : fields.actualGuestCount as number; if (actualGuestCount !== null && (typeof actualGuestCount !== "number" || !Number.isInteger(actualGuestCount) || actualGuestCount < 1 || actualGuestCount > 8)) return NextResponse.json({ message: "Số khách thực tế không hợp lệ." }, { status: 400, headers });
    if (typeof fields.requestId !== "string" || !uuid.test(fields.requestId)) return NextResponse.json({ message: "Thiếu mã yêu cầu. Tải lại trang để thử lại an toàn." }, { status: 400, headers });
    if (action === "move" && (typeof fields.newTableId !== "string" || !uuid.test(fields.newTableId) || fields.guestConsent !== true)) return NextResponse.json({ message: "Chọn bàn mới và xác nhận khách đã đồng ý đổi bàn." }, { status: 400, headers });
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("staff_operation", {
      p_request_id: fields.requestId, p_action: action, p_booking_id: id,
      p_table_id: action === "move" ? fields.newTableId : null, p_reason: reason || null,
      p_actual_guest_count: action === "check_in" ? actualGuestCount : null, p_guest_consent: action === "move" && fields.guestConsent === true,
    });
    if (error) { const result = bookingError(error); const messages: Record<string, string> = { REASON_REQUIRED: "Hãy nhập lý do.", INVALID_TRANSITION: "Booking đã thay đổi hoặc thao tác không phù hợp. Dữ liệu đã được tải lại.", PENDING_EXPIRED: "Booking đã hết thời gian chờ xác nhận.", CHECKIN_TOO_EARLY: "Chưa đến thời gian check-in.", TABLE_STILL_IN_USE: "Bàn vẫn còn khách đang phục vụ.", GUEST_CONSENT_REQUIRED: "Cần xác nhận khách đồng ý đổi bàn.", TABLE_NOT_READY: "Bàn chưa sẵn sàng.", NO_SHOW_TOO_EARLY: "Chưa đủ điều kiện đánh dấu không đến.", MOVE_NOT_ALLOWED: "Chỉ có thể đổi bàn cho booking đã xác nhận chưa check-in.", BOOKING_CONFLICT: "Bàn mới đang vướng lịch khác." }; return NextResponse.json({ message: messages[error.message ?? ""] ?? result.message }, { status: error.code === "42501" ? 403 : error.message === "BOOKING_NOT_FOUND" ? 404 : 409, headers }); }
    if (data?.reason === "pending_expired" && ["confirm", "reject", "cancel"].includes(action)) return NextResponse.json({ message: "Booking đã hết hạn và được hệ thống hủy." }, { status: 409, headers });
    return NextResponse.json({ bookingId: Array.isArray(data) ? data[0]?.id : (data as { id?: string } | null)?.id, action }, { headers });
  } catch (error) { if (error instanceof IdentityError) return NextResponse.json({ message: error.status === 401 ? "Vui lòng đăng nhập tài khoản Staff." : "Tài khoản không có quyền vận hành." }, { status: error.status, headers }); if (error instanceof SyntaxError) return NextResponse.json({ message: "JSON không hợp lệ." }, { status: 400, headers }); return NextResponse.json({ message: "Chưa thể hoàn tất thao tác. Vui lòng thử lại." }, { status: 503, headers }); }
}
