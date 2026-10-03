import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { OrderCatalogueItem, OrderHistory, OrderItemKind, OrderLine, OrderStatus, OrderView } from "@/lib/order-shared";
export type { OrderCatalogueItem, OrderHistory, OrderItemKind, OrderLine, OrderStatus, OrderView } from "@/lib/order-shared";

export function orderMutationsEnabled() {
  const config = getSupabaseConfig();
  if (!config || process.env.ORDER_MUTATIONS_ENABLED !== "true") return false;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const siteUrl = new URL(site ?? "");
    const supabaseUrl = new URL(config.url);
    if (siteUrl.origin === "https://moc-vi-restaurant.vercel.app") {
      return process.env.BOOKING_ALLOWED_SUPABASE_PROJECT_REF === "unhybmmbgumyhzaftlli"
        && supabaseUrl.origin === "https://unhybmmbgumyhzaftlli.supabase.co";
    }
    if (["localhost", "127.0.0.1", "[::1]"].includes(siteUrl.hostname)) {
      const ref = process.env.BOOKING_ALLOWED_SUPABASE_PROJECT_REF;
      return process.env.ORDER_LOCAL_MUTATIONS_ENABLED === "true"
        && (supabaseUrl.hostname === "localhost" || supabaseUrl.hostname === "127.0.0.1" || supabaseUrl.hostname === `${ref}.supabase.co`)
        && ref === "ojnkruytzhfqathvlexh"
        && process.env.VERCEL !== "1";
    }
  } catch { return false; }
  return false;
}

const orderFields = "id,booking_id,customer_id,status,total_amount,version,created_at,updated_at";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function orderView(supabase: SupabaseClient, order: Record<string, unknown>): Promise<OrderView> {
  const orderId = String(order.id);
  const [itemsResult, historyResult] = await Promise.all([
    supabase.from("order_items").select("id,line_no,item_type,item_code,item_name,unit_price,quantity,line_total,snapshot_components").eq("order_id", orderId).order("line_no"),
    supabase.from("order_history").select("id,from_status,to_status,reason,source,created_at").eq("order_id", orderId).order("created_at"),
  ]);
  if (itemsResult.error || historyResult.error) throw new Error("ORDER_DETAILS_UNAVAILABLE");
  return {
    id: orderId,
    booking_id: String(order.booking_id),
    customer_id: String(order.customer_id),
    status: order.status as OrderStatus,
    total_amount: Number(order.total_amount),
    version: Number(order.version),
    created_at: String(order.created_at),
    updated_at: String(order.updated_at),
    items: (itemsResult.data ?? []).map((item) => ({ ...item, item_type: item.item_type as OrderItemKind, unit_price: Number(item.unit_price), line_total: Number(item.line_total), snapshot_components: Array.isArray(item.snapshot_components) ? item.snapshot_components : [] })) as OrderLine[],
    history: (historyResult.data ?? []) as OrderHistory[],
  };
}

export async function getCustomerOrder(supabase: SupabaseClient, customerId: string, bookingId: string): Promise<OrderView | null> {
  if (!uuid.test(bookingId)) return null;
  const { data, error } = await supabase.from("orders").select(orderFields).eq("booking_id", bookingId).eq("customer_id", customerId).maybeSingle();
  if (error) throw new Error("CUSTOMER_ORDER_UNAVAILABLE");
  return data ? orderView(supabase, data as Record<string, unknown>) : null;
}

export async function getStaffOrder(supabase: SupabaseClient, bookingId: string): Promise<OrderView | null> {
  if (!uuid.test(bookingId)) return null;
  const { data, error } = await supabase.from("orders").select(orderFields).eq("booking_id", bookingId).maybeSingle();
  if (error) throw new Error("STAFF_ORDER_UNAVAILABLE");
  return data ? orderView(supabase, data as Record<string, unknown>) : null;
}

export async function getOrderCatalogue(supabase: SupabaseClient): Promise<OrderCatalogueItem[]> {
  const [dishes, combos] = await Promise.all([
    supabase.from("menu_items").select("code,name,description,price,is_available").eq("is_active", true).order("sort_order").order("code").limit(1000),
    supabase.from("menu_combos").select("code,name,description,price,is_available").eq("is_active", true).order("sort_order").order("code").limit(100),
  ]);
  if (dishes.error || combos.error) throw new Error("ORDER_CATALOGUE_UNAVAILABLE");
  return [
    ...(dishes.data ?? []).map((item) => ({ kind: "dish" as const, code: String(item.code), name: String(item.name), description: String(item.description), price: Number(item.price), available: Boolean(item.is_available) })),
    ...(combos.data ?? []).map((item) => ({ kind: "combo" as const, code: String(item.code), name: String(item.name), description: String(item.description), price: Number(item.price), available: Boolean(item.is_available) })),
  ];
}

export function orderError(error: { code?: string; message?: string }) {
  const messages: Record<string, string> = {
    CUSTOMER_REQUIRED: "Chỉ tài khoản Customer mới có thể đặt món.",
    STAFF_REQUIRED: "Tài khoản không có quyền xử lý đơn món.",
    BOOKING_NOT_FOUND: "Không tìm thấy booking hoặc bạn không có quyền truy cập.",
    BOOKING_NOT_ORDERABLE: "Booking chưa được xác nhận, đã kết thúc hoặc không còn nhận đặt món.",
    ORDER_ALREADY_EXISTS: "Booking này đã có một đơn món.",
    ORDER_NOT_FOUND: "Không tìm thấy đơn món.",
    ORDER_NOT_EDITABLE: "Đơn món không còn ở trạng thái có thể sửa.",
    ORDER_CONFLICT: "Đơn món vừa được thay đổi. Hãy tải lại để xem phiên bản mới.",
    INVALID_ITEMS: "Hãy chọn ít nhất một món hợp lệ.",
    INVALID_ITEM: "Có món hoặc số lượng không hợp lệ.",
    DUPLICATE_ITEM: "Mỗi món chỉ được xuất hiện một lần trong đơn.",
    ITEM_UNAVAILABLE: "Một món vừa hết phục vụ. Hãy kiểm tra lại thực đơn.",
    TOTAL_TOO_LARGE: "Tổng đơn vượt giới hạn kỹ thuật. Hãy chia thành yêu cầu phù hợp hơn.",
    INVALID_TRANSITION: "Đơn món đã thay đổi hoặc không thể chuyển trạng thái này.",
    REASON_REQUIRED: "Hãy nhập lý do khi hủy đơn.",
    IDEMPOTENCY_PAYLOAD_MISMATCH: "Lần thử lại không khớp yêu cầu trước.",
    ORDER_NOT_COMPLETE: "Hãy xử lý xong đơn món trước khi hoàn tất booking.",
  };
  if (error.code === "42501") return { status: 403, message: "Tài khoản không có quyền thực hiện yêu cầu này." };
  if (error.message && messages[error.message]) return { status: ["ORDER_NOT_FOUND", "BOOKING_NOT_FOUND"].includes(error.message) ? 404 : ["ORDER_CONFLICT", "ORDER_NOT_EDITABLE", "INVALID_TRANSITION", "ORDER_ALREADY_EXISTS"].includes(error.message) ? 409 : 422, message: messages[error.message] };
  return { status: 503, message: "Dịch vụ đặt món chưa sẵn sàng. Vui lòng thử lại sau." };
}
