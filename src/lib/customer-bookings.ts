import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CustomerBooking = {
  id: string;
  customer_id: string;
  table_id: string;
  status: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  notes: string;
  guest_count: number;
  starts_at: string;
  ends_at: string;
  blocked_until: string;
  expires_at: string | null;
  cancellation_source: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerBookingView = CustomerBooking & {
  table: { code: string; capacity: number } | null;
};

export type CustomerNotification = {
  id: string;
  history_id: string;
  read_at: string | null;
  created_at: string;
  booking_id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  source: string;
};

type TableRow = { id: string; code: string; capacity: number };
type HistoryRow = { id: string; booking_id: string; from_status: string | null; to_status: string; reason: string | null; source: string; created_at: string };
type NotificationRow = { id: string; history_id: string; read_at: string | null; created_at: string };

const bookingFields = "id,customer_id,table_id,status,contact_name,contact_phone,contact_email,notes,guest_count,starts_at,ends_at,blocked_until,expires_at,cancellation_source,reason,created_at,updated_at";

async function tableMap(supabase: SupabaseClient, tableIds: string[]) {
  if (!tableIds.length) return new Map<string, TableRow>();
  const { data, error } = await supabase.from("tables").select("id,code,capacity").in("id", tableIds);
  if (error) throw new Error("CUSTOMER_BOOKINGS_TABLES_UNAVAILABLE");
  return new Map(((data ?? []) as TableRow[]).map((table) => [table.id, table]));
}

export async function getCustomerBookings(supabase: SupabaseClient, customerId: string): Promise<CustomerBookingView[]> {
  const { data, error } = await supabase.from("bookings").select(bookingFields).eq("customer_id", customerId).order("starts_at", { ascending: false });
  if (error) throw new Error("CUSTOMER_BOOKINGS_UNAVAILABLE");
  const rows = (data ?? []) as CustomerBooking[];
  const tables = await tableMap(supabase, rows.map((booking) => booking.table_id));
  return rows.map((booking) => ({ ...booking, table: tables.get(booking.table_id) ?? null }));
}

export async function getCustomerBooking(supabase: SupabaseClient, customerId: string, id: string): Promise<CustomerBookingView | null> {
  const { data, error } = await supabase.from("bookings").select(bookingFields).eq("id", id).eq("customer_id", customerId).maybeSingle();
  if (error) throw new Error("CUSTOMER_BOOKING_UNAVAILABLE");
  if (!data) return null;
  const booking = data as CustomerBooking;
  const tables = await tableMap(supabase, [booking.table_id]);
  return { ...booking, table: tables.get(booking.table_id) ?? null };
}

export async function getCustomerHistory(supabase: SupabaseClient, bookingId: string): Promise<HistoryRow[]> {
  const { data, error } = await supabase.from("booking_history").select("id,booking_id,from_status,to_status,reason,source,created_at").eq("booking_id", bookingId).order("created_at", { ascending: true });
  if (error) throw new Error("CUSTOMER_BOOKING_HISTORY_UNAVAILABLE");
  return (data ?? []) as HistoryRow[];
}

export async function getCustomerNotifications(supabase: SupabaseClient, customerId: string): Promise<CustomerNotification[]> {
  const { data, error } = await supabase.from("notifications").select("id,history_id,read_at,created_at").eq("recipient_id", customerId).order("created_at", { ascending: false }).limit(20);
  if (error) throw new Error("CUSTOMER_NOTIFICATIONS_UNAVAILABLE");
  const notifications = (data ?? []) as NotificationRow[];
  const historyIds = notifications.map((notification) => notification.history_id);
  if (!historyIds.length) return [];
  const { data: history, error: historyError } = await supabase.from("booking_history").select("id,booking_id,from_status,to_status,reason,source,created_at").in("id", historyIds);
  if (historyError) throw new Error("CUSTOMER_NOTIFICATIONS_HISTORY_UNAVAILABLE");
  const historyMap = new Map(((history ?? []) as HistoryRow[]).map((event) => [event.id, event]));
  return notifications.flatMap((notification) => {
    const event = historyMap.get(notification.history_id);
    return event ? [{ ...notification, booking_id: event.booking_id, from_status: event.from_status, to_status: event.to_status, reason: event.reason, source: event.source }] : [];
  });
}

export function bookingStatusLabel(status: string) {
  return ({ pending: "Chờ nhà hàng xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã hủy", checked_in: "Đang phục vụ", completed: "Hoàn tất", rejected: "Từ chối", no_show: "Không đến" } as Record<string, string>)[status] ?? "Đang cập nhật";
}

export function formatBookingDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}

export function canCustomerCancel(booking: Pick<CustomerBooking, "status" | "starts_at">, now = Date.now()) {
  return ["pending", "confirmed"].includes(booking.status) && new Date(booking.starts_at).getTime() - now >= 60 * 60 * 1000;
}
