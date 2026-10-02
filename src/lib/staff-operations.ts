import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bookingStatusLabel, formatBookingDate } from "@/lib/customer-bookings";

export type StaffBooking = { id: string; customer_id: string | null; table_id: string; status: string; source: string; contact_name: string; contact_phone: string; contact_email: string | null; notes: string; guest_count: number; starts_at: string; ends_at: string; expires_at: string | null; reason: string | null; created_at: string; table: { id: string; code: string; capacity: number; status: string; area_id: string } | null };
export type StaffTable = { id: string; code: string; capacity: number; status: string; area_id: string; description: string };
export type StaffHistory = { id: string; from_status: string | null; to_status: string; reason: string | null; source: string; created_at: string };
const bookingFields = "id,customer_id,table_id,status,source,contact_name,contact_phone,contact_email,notes,guest_count,starts_at,ends_at,expires_at,reason,created_at";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function getTables(supabase: SupabaseClient, ids: string[]) { if (!ids.length) return new Map<string, StaffTable>(); const { data, error } = await supabase.from("tables").select("id,code,capacity,status,area_id,description").in("id", ids); if (error) throw new Error("STAFF_TABLES_UNAVAILABLE"); return new Map(((data ?? []) as StaffTable[]).map((table) => [table.id, table])); }
export async function getStaffTables(supabase: SupabaseClient) { const { data, error } = await supabase.from("tables").select("id,code,capacity,status,area_id,description").order("code"); if (error) throw new Error("STAFF_TABLES_UNAVAILABLE"); return (data ?? []) as StaffTable[]; }
export async function getStaffBookings(supabase: SupabaseClient, filters: { date?: string; status?: string; tableId?: string }) {
  let query = supabase.from("bookings").select(bookingFields).order("starts_at", { ascending: true }).limit(100);
  if (filters.status && ["pending", "confirmed", "checked_in", "completed", "cancelled", "rejected", "no_show"].includes(filters.status)) query = query.eq("status", filters.status);
  if (filters.tableId && uuid.test(filters.tableId)) query = query.eq("table_id", filters.tableId);
  if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)) { const start = `${filters.date}T00:00:00+07:00`; const next = new Date(new Date(start).getTime() + 86400000).toISOString(); query = query.gte("starts_at", start).lt("starts_at", next); }
  const { data, error } = await query; if (error) throw new Error("STAFF_BOOKINGS_UNAVAILABLE"); const rows = (data ?? []) as Omit<StaffBooking, "table">[]; const tables = await getTables(supabase, rows.map((booking) => booking.table_id)); return rows.map((booking) => ({ ...booking, table: tables.get(booking.table_id) ?? null })) as StaffBooking[];
}
export async function getStaffBooking(supabase: SupabaseClient, bookingId: string) {
  if (!uuid.test(bookingId)) return null;
  const { data, error } = await supabase.from("bookings").select(bookingFields).eq("id", bookingId).maybeSingle();
  if (error) throw new Error("STAFF_BOOKING_UNAVAILABLE");
  if (!data) return null;
  const tables = await getTables(supabase, [(data as Omit<StaffBooking, "table">).table_id]);
  return { ...(data as Omit<StaffBooking, "table">), table: tables.get((data as Omit<StaffBooking, "table">).table_id) ?? null } as StaffBooking;
}
export async function getStaffHistory(supabase: SupabaseClient, bookingId: string) { const { data, error } = await supabase.from("booking_history").select("id,from_status,to_status,reason,source,created_at").eq("booking_id", bookingId).order("created_at", { ascending: true }); if (error) throw new Error("STAFF_HISTORY_UNAVAILABLE"); return (data ?? []) as StaffHistory[]; }
export function staffStatusLabel(status: string) { return bookingStatusLabel(status); }
export { formatBookingDate };
