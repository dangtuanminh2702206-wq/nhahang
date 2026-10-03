import { NextRequest, NextResponse } from "next/server";
import { IdentityError, requireRole } from "@/lib/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getApplicationOrigin } from "@/lib/supabase/origin";
import { orderError, orderMutationsEnabled } from "@/lib/order";
import { validOrderId, validOrderRequestId } from "@/lib/order-input";
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== getApplicationOrigin(request)) return NextResponse.json({ message: "Yêu cầu không hợp lệ." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ message: "Yêu cầu cần định dạng JSON." }, { status: 415, headers });
  if (!orderMutationsEnabled()) return NextResponse.json({ message: "Chức năng xử lý đơn món chưa được bật cho môi trường này." }, { status: 503, headers });
  try {
    await requireRole(["staff", "admin"]);
    const raw = await request.text(); if (raw.length > 8192) return NextResponse.json({ message: "Yêu cầu quá dài." }, { status: 413, headers });
    const body: unknown = JSON.parse(raw); if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400, headers });
    const fields = body as Record<string, unknown>;
    if (!validOrderRequestId(fields.requestId) || !validOrderId(fields.orderId) || !["confirm", "preparing", "served", "cancel"].includes(String(fields.action))) return NextResponse.json({ message: "Đơn món hoặc thao tác không hợp lệ." }, { status: 400, headers });
    const reason = typeof fields.reason === "string" ? fields.reason.trim() : null;
    if (fields.action === "cancel" && (!reason || reason.length > 500)) return NextResponse.json({ message: "Hãy nhập lý do hủy tối đa 500 ký tự." }, { status: 400, headers });
    if (fields.expectedVersion !== undefined && (!Number.isSafeInteger(fields.expectedVersion) || Number(fields.expectedVersion) < 1)) return NextResponse.json({ message: "Phiên bản đơn món không hợp lệ." }, { status: 400, headers });
    const db = await createSupabaseServerClient();
    const result = await db.rpc("staff_order_operation", { p_request_id: fields.requestId, p_order_id: fields.orderId, p_action: fields.action, p_reason: reason, p_expected_version: fields.expectedVersion ?? null });
    if (result.error) { const mapped = orderError(result.error); return NextResponse.json({ message: mapped.message }, { status: result.error.code === "42501" ? 403 : mapped.status, headers }); }
    const order = Array.isArray(result.data) ? result.data[0] : result.data;
    return NextResponse.json({ order: { id: order?.id, status: order?.status, version: order?.version } }, { headers });
  } catch (error) {
    if (error instanceof IdentityError) return NextResponse.json({ message: error.status === 401 ? "Vui lòng đăng nhập tài khoản Staff." : "Tài khoản không có quyền xử lý đơn món." }, { status: error.status, headers });
    if (error instanceof SyntaxError) return NextResponse.json({ message: "JSON không hợp lệ." }, { status: 400, headers });
    return NextResponse.json({ message: "Chưa thể xử lý đơn món. Vui lòng thử lại." }, { status: 503, headers });
  }
}
