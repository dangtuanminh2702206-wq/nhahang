import { NextRequest, NextResponse } from "next/server";
import { IdentityError, requireRole } from "@/lib/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getApplicationOrigin } from "@/lib/supabase/origin";
import { bookingError, bookingMutationsEnabled } from "@/lib/booking";
const headers = { "Cache-Control": "private, no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: NextRequest) {
  if (!bookingMutationsEnabled()) return NextResponse.json({ message: "Thao tác vận hành chưa được bật cho môi trường này." }, { status: 503, headers });
  if (request.headers.get("origin") !== getApplicationOrigin(request)) return NextResponse.json({ message: "Yêu cầu không hợp lệ." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ message: "Yêu cầu cần định dạng JSON." }, { status: 415, headers });
  try {
    await requireRole(["staff", "admin"]);
    const raw = await request.text();
    if (raw.length > 8192) return NextResponse.json({ message: "Yêu cầu quá dài." }, { status: 413, headers });
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400, headers });
    const fields = body as Record<string, unknown>;
    const { tableId, source, startsAt, guestCount, idempotencyKey } = fields;
    if (typeof tableId !== "string" || !uuid.test(tableId)
      || typeof idempotencyKey !== "string" || !uuid.test(idempotencyKey)
      || (source !== "phone" && source !== "walk_in")
      || typeof startsAt !== "string" || !Number.isFinite(Date.parse(startsAt))
      || typeof guestCount !== "number" || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 8
      || typeof fields.name !== "string" || !fields.name.trim() || fields.name.length > 120
      || typeof fields.phone !== "string" || !fields.phone.trim() || fields.phone.length > 32
      || (fields.email !== undefined && (typeof fields.email !== "string" || fields.email.length > 254))
      || (fields.notes !== undefined && (typeof fields.notes !== "string" || fields.notes.length > 500))) {
      return NextResponse.json({ message: "Kiểm tra lại thông tin booking." }, { status: 400, headers });
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("create_booking", {
      p_idempotency_key: idempotencyKey, p_table_id: tableId, p_starts_at: startsAt,
      p_guest_count: guestCount, p_contact_name: fields.name.trim(), p_contact_phone: fields.phone.trim(),
      p_contact_email: typeof fields.email === "string" ? fields.email.trim() || null : null,
      p_notes: typeof fields.notes === "string" ? fields.notes.trim() : "", p_source: source, p_customer_id: null,
    });
    if (error) { const result = bookingError(error); return NextResponse.json({ message: result.message }, { status: result.status, headers }); }
    const booking = Array.isArray(data) ? data[0] : data;
    if (!booking?.id || !uuid.test(booking.id)) return NextResponse.json({ message: "Chưa nhận được xác nhận booking. Thử lại cùng thông tin." }, { status: 503, headers });
    return NextResponse.json({ bookingId: booking.id, status: booking.status }, { headers });
  } catch (error) {
    if (error instanceof IdentityError) return NextResponse.json({ message: "Tài khoản không có quyền tạo booking vận hành." }, { status: error.status, headers });
    if (error instanceof SyntaxError) return NextResponse.json({ message: "JSON không hợp lệ." }, { status: 400, headers });
    return NextResponse.json({ message: "Chưa thể tạo booking. Vui lòng thử lại cùng thông tin." }, { status: 503, headers });
  }
}
