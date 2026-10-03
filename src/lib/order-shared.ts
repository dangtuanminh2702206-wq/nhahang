export type OrderStatus = "pending" | "confirmed" | "preparing" | "served" | "cancelled";
export type OrderItemKind = "dish" | "combo";
export type OrderLine = {
  id: string;
  line_no: number;
  item_type: OrderItemKind;
  item_code: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  snapshot_components: unknown[];
};
export type OrderHistory = { id: string; from_status: OrderStatus | null; to_status: OrderStatus; reason: string | null; source: string; created_at: string };
export type OrderView = { id: string; booking_id: string; customer_id: string; status: OrderStatus; total_amount: number; version: number; created_at: string; updated_at: string; items: OrderLine[]; history: OrderHistory[] };
export type OrderCatalogueItem = { kind: OrderItemKind; code: string; name: string; description: string; price: number; available: boolean };

export function orderStatusLabel(status: string) {
  return ({ pending: "Chờ xác nhận", confirmed: "Đã xác nhận", preparing: "Đang chuẩn bị", served: "Đã phục vụ", cancelled: "Đã hủy" } as Record<string, string>)[status] ?? "Đang cập nhật";
}
