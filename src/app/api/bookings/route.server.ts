import { NextRequest, NextResponse } from "next/server";
import { bookingError, bookingMutationsEnabled } from "@/lib/booking";
import { parseBooking } from "@/lib/booking-input";
import { IdentityError, requireRole } from "@/lib/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getApplicationOrigin } from "@/lib/supabase/origin";

const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== getApplicationOrigin(request)) return NextResponse.json({ message: "Yêu cầu không hợp lệ." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ message: "Yêu cầu cần định dạng JSON." }, { status: 415, headers });
  // Fail closed before any RPC. Auth cannot bypass this local-only gate.
  if (!bookingMutationsEnabled()) return NextResponse.json({ message: "Chưa nhận đặt bàn thật. Chức năng tạo booking chỉ dành cho môi trường local cô lập." }, { status: 503, headers });
  try {
    const text = await request.text();
    if (text.length > 8192) return NextResponse.json({ message: "Yêu cầu quá dài." }, { status: 413, headers });
    let value: unknown;
    try { value = JSON.parse(text); } catch { return NextResponse.json({ message: "JSON không hợp lệ." }, { status: 400, headers }); }
    const input = parseBooking(value);
    if (!input) return NextResponse.json({ message: "Kiểm tra lại thông tin đặt bàn." }, { status: 400, headers });
    const { user } = await requireRole(["customer"]);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("create_booking", {
      p_idempotency_key: input.idempotencyKey, p_table_id: input.tableId,
      p_starts_at: input.startsAt, p_guest_count: input.guests,
      p_contact_name: input.name, p_contact_phone: input.phone,
      p_contact_email: user.email ?? null, p_notes: input.notes, p_source: "website",
    });
    if (error) { const result = bookingError(error); return NextResponse.json({ message: result.message }, { status: result.status, headers }); }
    const booking = Array.isArray(data) ? data[0] : data;
    if (!booking || booking.customer_id !== user.id || booking.created_by !== user.id) throw new Error("INVALID_BOOKING_RESPONSE");
    return NextResponse.json({ booking: { id: booking.id, status: booking.status, expiresAt: booking.expires_at } }, { headers });
  } catch (error) {
    if (error instanceof IdentityError) return NextResponse.json({ message: error.status === 401 ? "Vui lòng đăng nhập trước khi đặt bàn." : "Không thể xác minh quyền tài khoản." }, { status: error.status, headers });
    return NextResponse.json({ message: "Chưa xác nhận kết quả. Vui lòng thử lại cùng thông tin để tránh tạo trùng." }, { status: 503, headers });
  }
}
