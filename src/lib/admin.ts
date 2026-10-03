import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminSettings = {
  id: boolean;
  name: string;
  timezone: string;
  duration_minutes: number;
  buffer_minutes: number;
  min_notice_minutes: number;
  max_advance_days: number;
  pending_minutes: number;
  cancellation_minutes: number;
  early_checkin_minutes: number;
  no_show_minutes: number;
  max_active_bookings: number;
  max_guests: number;
};

export type AdminHour = { id: string; weekday: number; opens_at: string; closes_at: string };
export type AdminClosure = { closed_on: string; reason: string };
export type AdminArea = { id: string; code: string; name: string; is_active: boolean };
export type AdminTable = { id: string; code: string; area_id: string; capacity: number; status: string; is_active: boolean; description: string };
export type AdminCategory = { id: string; code: string; name: string; sort_order: number; is_active: boolean };
export type AdminMenuItem = { id: string; code: string; category_id: string; name: string; description: string; price: string | number; image_path: string | null; is_available: boolean; is_active: boolean; is_featured: boolean; sort_order: number };
export type AdminProfile = { id: string; full_name: string; phone: string | null; role: "customer" | "staff" | "admin"; is_active: boolean; created_at: string };
export type AdminAudit = { id: string; actor_id: string | null; entity_id: string; entity_type: string; action: string; details: Record<string, unknown>; created_at: string };
export type AdminBookingSummary = { id: string; table_id: string; status: string; source: string; starts_at: string };

export type AdminSnapshot = {
  settings: AdminSettings;
  hours: AdminHour[];
  closures: AdminClosure[];
  areas: AdminArea[];
  tables: AdminTable[];
  categories: AdminCategory[];
  menuItems: AdminMenuItem[];
  profiles: AdminProfile[];
  audits: AdminAudit[];
  bookings: AdminBookingSummary[];
};

async function read<T>(promise: PromiseLike<{ data: unknown; error: { message: string } | null }>, code: string): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(code);
  return (data ?? []) as T;
}

export async function getAdminSnapshot(supabase: SupabaseClient, range: { from: string; to: string }): Promise<AdminSnapshot> {
  // PostgREST caps each response: page explicitly instead of silently undercounting.
  async function allRows<T>(table: string, columns: string, order: string, code: string, bookingRange = false): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; offset < 10000; offset += 500) {
      let query = supabase.from(table).select(columns).order(order).order("id").range(offset, offset + 499);
      if (bookingRange) query = query.gte("starts_at", range.from).lt("starts_at", range.to);
      const batch = await read<T[]>(query, code);
      rows.push(...batch);
      if (batch.length < 500) return rows;
    }
    throw new Error(code);
  }
  const [settings, hours, closures, areas, tables, categories, menuItems, profiles, audits, bookings] = await Promise.all([
    read<AdminSettings>(supabase.from("restaurant_settings").select("id,name,timezone,duration_minutes,buffer_minutes,min_notice_minutes,max_advance_days,pending_minutes,cancellation_minutes,early_checkin_minutes,no_show_minutes,max_active_bookings,max_guests").eq("id", true).single(), "ADMIN_SETTINGS_UNAVAILABLE"),
    read<AdminHour[]>(supabase.from("business_hours").select("id,weekday,opens_at,closes_at").order("weekday").order("opens_at"), "ADMIN_HOURS_UNAVAILABLE"),
    read<AdminClosure[]>(supabase.from("closure_dates").select("closed_on,reason").order("closed_on", { ascending: false }).limit(100), "ADMIN_CLOSURES_UNAVAILABLE"),
    read<AdminArea[]>(supabase.from("areas").select("id,code,name,is_active").order("code"), "ADMIN_AREAS_UNAVAILABLE"),
    read<AdminTable[]>(supabase.from("tables").select("id,code,area_id,capacity,status,is_active,description").order("code"), "ADMIN_TABLES_UNAVAILABLE"),
    read<AdminCategory[]>(supabase.from("menu_categories").select("id,code,name,sort_order,is_active").order("sort_order").order("code"), "ADMIN_CATEGORIES_UNAVAILABLE"),
    read<AdminMenuItem[]>(supabase.from("menu_items").select("id,code,category_id,name,description,price,image_path,is_available,is_active,is_featured,sort_order").order("sort_order").order("code"), "ADMIN_MENU_UNAVAILABLE"),
    allRows<AdminProfile>("profiles", "id,full_name,phone,role,is_active,created_at", "created_at", "ADMIN_PROFILES_UNAVAILABLE"),
    read<AdminAudit[]>(supabase.from("audit_logs").select("id,actor_id,entity_id,entity_type,action,details,created_at").order("created_at", { ascending: false }).limit(80), "ADMIN_AUDIT_UNAVAILABLE"),
    allRows<AdminBookingSummary>("bookings", "id,table_id,status,source,starts_at", "starts_at", "ADMIN_BOOKINGS_UNAVAILABLE", true),
  ]);
  return { settings, hours, closures, areas, tables, categories, menuItems, profiles, audits, bookings };
}

export function adminErrorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    ADMIN_CONFLICT: "Dữ liệu vừa thay đổi ở nơi khác. Hãy tải lại rồi thử lại.",
    ADMIN_EXPECTED_REQUIRED: "Thiếu dữ liệu đối chiếu. Hãy tải lại trang trước khi lưu.",
    SPATIAL_MAPPING_REQUIRED: "Chuyển tầng cần sơ đồ vị trí được duyệt; chức năng này chưa được hỗ trợ.",
    ADMIN_REQUIRED: "Tài khoản không có quyền Admin.",
    REASON_REQUIRED: "Thao tác quản trị cần lý do rõ ràng.",
    INVALID_POLICY: "Các policy chưa hợp lệ: kiểm tra quan hệ giữa thời lượng, giờ báo trước và giới hạn.",
    INVALID_HOURS: "Khung giờ không hợp lệ.",
    HOURS_OVERLAP: "Khung giờ bị chồng lấn trong cùng ngày.",
    TABLE_NOT_READY: "Không thể đưa bàn đang occupied hoặc cleaning về available bằng Admin.",
    TABLE_HAS_ACTIVE_BOOKINGS: "Bàn còn booking đang giữ chỗ hoặc đang phục vụ.",
    CAPACITY_CONFLICT: "Sức chứa mới nhỏ hơn số khách của booking đang hoạt động.",
    LAST_ADMIN: "Không thể hạ quyền hoặc khóa Admin active cuối cùng.",
    SELF_PROTECTION: "Không thể tự khóa hoặc tự hạ quyền tài khoản Admin hiện tại.",
    IMAGE_NOT_IN_CATALOGUE: "Ảnh phải thuộc catalogue WebP được phép của Mộc Vị.",
    CATEGORY_UNAVAILABLE: "Danh mục không tồn tại hoặc đang bị ẩn.",
    AREA_HAS_ACTIVE_TABLES: "Không thể ẩn khu vực còn bàn active.",
    INVALID_CLOSURE: "Ngày nghỉ hoặc lý do chưa hợp lệ.",
  };
  return messages[code] ?? "Không thể hoàn tất thao tác quản trị. Dữ liệu chưa được thay đổi.";
}
