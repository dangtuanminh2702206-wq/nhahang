import { NextRequest, NextResponse } from "next/server";
import { IdentityError, requireRole } from "@/lib/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getApplicationOrigin } from "@/lib/supabase/origin";
import { bookingMutationsEnabled } from "@/lib/booking";
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
    if (typeof fields.tableId !== "string" || !uuid.test(fields.tableId) || typeof fields.requestId !== "string" || !uuid.test(fields.requestId)) return NextResponse.json({ message: "Bàn hoặc mã yêu cầu không hợp lệ." }, { status: 400, headers });
    const { data, error } = await (await createSupabaseServerClient()).rpc("staff_operation", { p_request_id: fields.requestId, p_action: "ready", p_table_id: fields.tableId });
    if (error) return NextResponse.json({ message: "Chưa thể cập nhật bàn. Tải lại trạng thái trước khi tiếp tục." }, { status: error.code === "42501" ? 403 : 409, headers });
    if (data?.status !== "available" || data?.id !== fields.tableId) return NextResponse.json({ message: "Chưa nhận được xác nhận bàn sẵn sàng." }, { status: 503, headers });
    return NextResponse.json({ tableId: fields.tableId, status: "available" }, { headers });
  } catch (error) {
    if (error instanceof IdentityError) return NextResponse.json({ message: "Tài khoản không có quyền vận hành." }, { status: error.status, headers });
    if (error instanceof SyntaxError) return NextResponse.json({ message: "JSON không hợp lệ." }, { status: 400, headers });
    return NextResponse.json({ message: "Chưa thể cập nhật bàn." }, { status: 503, headers });
  }
}
