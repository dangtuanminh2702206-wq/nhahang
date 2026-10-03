import { NextRequest, NextResponse } from "next/server";
import { IdentityError, requireRole } from "@/lib/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getApplicationOrigin } from "@/lib/supabase/origin";
import { orderError, orderMutationsEnabled } from "@/lib/order";
import { parseOrderItems, validOrderId, validOrderRequestId } from "@/lib/order-input";

const headers = { "Cache-Control": "private, no-store" };
function reply(message: string, status: number) { return NextResponse.json({ message }, { status, headers }); }
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== getApplicationOrigin(request)) return reply("Yêu cầu không hợp lệ.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply("Yêu cầu cần định dạng JSON.", 415);
  if (!orderMutationsEnabled()) return reply("Chức năng đặt món chưa được bật cho môi trường này.", 503);
  try {
    const raw = await request.text();
    if (raw.length > 16384) return reply("Yêu cầu quá dài.", 413);
    let value: unknown;
    try { value = JSON.parse(raw); } catch { return reply("JSON không hợp lệ.", 400); }
    if (!value || typeof value !== "object" || Array.isArray(value)) return reply("Dữ liệu không hợp lệ.", 400);
    const body = value as Record<string, unknown>;
    if (!validOrderRequestId(body.requestId) || !validOrderId(body.bookingId)) return reply("Mã yêu cầu hoặc booking không hợp lệ.", 400);
    const action = body.action;
    const { user } = await requireRole(["customer"]);
    const db = await createSupabaseServerClient();
    let result;
    if (action === "create") {
      const items = parseOrderItems(body.items); if (!items) return reply("Kiểm tra lại các món và số lượng.", 400);
      result = await db.rpc("create_order", { p_booking_id: body.bookingId, p_items: items, p_request_id: body.requestId });
    } else if (action === "update") {
      const items = parseOrderItems(body.items); if (!validOrderId(body.orderId) || !items || !Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion) < 1) return reply("Dữ liệu cập nhật không hợp lệ.", 400);
      result = await db.rpc("update_pending_order", { p_order_id: body.orderId, p_items: items, p_expected_version: body.expectedVersion, p_request_id: body.requestId });
    } else if (action === "cancel") {
      if (!validOrderId(body.orderId)) return reply("Đơn món không hợp lệ.", 400);
      result = await db.rpc("cancel_pending_order", { p_order_id: body.orderId, p_request_id: body.requestId });
    } else return reply("Thao tác không hợp lệ.", 400);
    if (result.error) { const mapped = orderError(result.error); return reply(mapped.message, mapped.status); }
    const order = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!order || order.customer_id !== user.id) return reply("Không thể xác minh kết quả đơn món.", 503);
    return NextResponse.json({ order: { id: order.id, status: order.status, totalAmount: order.total_amount, version: order.version } }, { headers });
  } catch (error) {
    if (error instanceof IdentityError) return reply(error.status === 401 ? "Vui lòng đăng nhập bằng tài khoản Customer." : "Tài khoản không có quyền đặt món.", error.status);
    return reply("Chưa thể hoàn tất đơn món. Vui lòng thử lại với cùng yêu cầu.", 503);
  }
}
