import { NextRequest, NextResponse } from "next/server";
import { bookingError, bookingMutationsEnabled } from "@/lib/booking";
import { IdentityError, requireRole } from "@/lib/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getApplicationOrigin } from "@/lib/supabase/origin";

const headers = { "Cache-Control": "private, no-store" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (request.headers.get("origin") !== getApplicationOrigin(request)) {
    return NextResponse.json({ message: "Yêu cầu không hợp lệ." }, { status: 403, headers });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ message: "Yêu cầu không hợp lệ." }, { status: 415, headers });
  }
  if (!bookingMutationsEnabled()) {
    return NextResponse.json({ message: "Chức năng hủy đặt bàn chưa được bật cho môi trường này." }, { status: 503, headers });
  }
  const { id } = await context.params;
  if (!uuidPattern.test(id)) return NextResponse.json({ message: "Đặt bàn không hợp lệ." }, { status: 400, headers });

  try {
    const { user } = await requireRole(["customer"]);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("cancel_booking", { p_id: id });
    if (error) {
      const result = bookingError(error);
      return NextResponse.json({ message: result.message }, { status: result.status, headers });
    }
    const booking = Array.isArray(data) ? data[0] : data;
    if (!booking || booking.customer_id !== user.id) throw new Error("INVALID_BOOKING_RESPONSE");
    return NextResponse.json({ booking: { id: booking.id, status: booking.status, cancellationSource: booking.cancellation_source, reason: booking.reason } }, { headers });
  } catch (error) {
    if (error instanceof IdentityError) {
      return NextResponse.json({ message: error.status === 401 ? "Vui lòng đăng nhập trước khi hủy đặt bàn." : "Tài khoản không có quyền hủy đặt bàn." }, { status: error.status, headers });
    }
    return NextResponse.json({ message: "Chưa xác nhận kết quả hủy. Vui lòng mở lại danh sách để kiểm tra." }, { status: 503, headers });
  }
}
