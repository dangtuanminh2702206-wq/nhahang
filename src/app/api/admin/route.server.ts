import { NextRequest, NextResponse } from "next/server";
import { adminErrorMessage } from "@/lib/admin";
import { IdentityError, requireRole } from "@/lib/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getApplicationOrigin } from "@/lib/supabase/origin";

const headers = { "Cache-Control": "private, no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const roles = ["customer", "staff", "admin"] as const;
const tableStatuses = ["available", "occupied", "cleaning", "out_of_service"] as const;
type Fields = Record<string, unknown>;

function record(value: unknown): Fields | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Fields : null; }
function text(value: unknown, max = 500) { return typeof value === "string" && value.trim().length <= max ? value.trim() : null; }
function id(value: unknown) { return typeof value === "string" && uuid.test(value) ? value : null; }
function integer(value: unknown, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) { return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : null; }
function finiteNumber(value: unknown) { return (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) ? Number(value) : null; }
function requiredExpected(fields: Fields) { const expected = record(fields.expected); return expected ?? {}; }
function invalid(message = "Dữ liệu quản trị không hợp lệ.") { return NextResponse.json({ message }, { status: 400, headers }); }

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== getApplicationOrigin(request)) return NextResponse.json({ message: "Yêu cầu không hợp lệ." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ message: "Yêu cầu cần định dạng JSON." }, { status: 415, headers });
  try {
    await requireRole(["admin"]);
    const raw = await request.text();
    if (raw.length > 24000) return NextResponse.json({ message: "Yêu cầu quá dài." }, { status: 413, headers });
    const fields = record(JSON.parse(raw));
    if (!fields || typeof fields.action !== "string") return invalid();
    const supabase = await createSupabaseServerClient();
    const reason = text(fields.reason);
    if (!reason) return invalid("Mọi thay đổi Admin đều cần lý do.");
    let data: unknown;
    let error: { message?: string; code?: string } | null = null;
    const action = fields.action;
    if (action === "settings") {
      const name = text(fields.name, 120);
      const values = ["durationMinutes", "bufferMinutes", "minNoticeMinutes", "maxAdvanceDays", "pendingMinutes", "cancellationMinutes", "earlyCheckinMinutes", "noShowMinutes", "maxActiveBookings", "maxGuests"];
      const numbers = values.map((key) => integer(fields[key], 0, 100000));
      if (!name || numbers.some((value) => value === null)) return invalid();
      ({ data, error } = await supabase.rpc("admin_update_settings", { p_name: name, p_duration_minutes: numbers[0], p_buffer_minutes: numbers[1], p_min_notice_minutes: numbers[2], p_max_advance_days: numbers[3], p_pending_minutes: numbers[4], p_cancellation_minutes: numbers[5], p_early_checkin_minutes: numbers[6], p_no_show_minutes: numbers[7], p_max_active_bookings: numbers[8], p_max_guests: numbers[9], p_expected: requiredExpected(fields), p_reason: reason }));
    } else if (action === "hours-upsert") {
      const hourId = fields.id === null || fields.id === undefined || fields.id === "" ? null : id(fields.id);
      const weekday = integer(fields.weekday, 0, 6);
      const opensAt = text(fields.opensAt, 8); const closesAt = text(fields.closesAt, 8);
      if ((fields.id && !hourId) || weekday === null || !opensAt || !closesAt) return invalid();
      ({ data, error } = await supabase.rpc("admin_upsert_business_hours", { p_id: hourId, p_weekday: weekday, p_opens_at: opensAt, p_closes_at: closesAt, p_expected: hourId ? requiredExpected(fields) : null, p_reason: reason }));
    } else if (action === "hours-delete") {
      const hourId = id(fields.id); if (!hourId) return invalid();
      ({ data, error } = await supabase.rpc("admin_delete_business_hours", { p_id: hourId, p_expected: requiredExpected(fields), p_reason: reason }));
    } else if (action === "closure-upsert") {
      const closedOn = text(fields.closedOn, 10); const closureReason = text(fields.closureReason, 500);
      if (!closedOn || !/^\d{4}-\d{2}-\d{2}$/.test(closedOn) || !closureReason) return invalid();
      ({ data, error } = await supabase.rpc("admin_upsert_closure_date", { p_closed_on: closedOn, p_closure_reason: closureReason, p_previous_reason: fields.previousReason === null ? null : text(fields.previousReason, 500), p_reason: reason }));
    } else if (action === "closure-delete") {
      const closedOn = text(fields.closedOn, 10); const previousReason = text(fields.previousReason, 500);
      if (!closedOn || !/^\d{4}-\d{2}-\d{2}$/.test(closedOn) || !previousReason) return invalid();
      ({ data, error } = await supabase.rpc("admin_delete_closure_date", { p_closed_on: closedOn, p_previous_reason: previousReason, p_reason: reason }));
    } else if (action === "area") {
      const areaId = id(fields.id); const name = text(fields.name, 120); const active = typeof fields.isActive === "boolean" ? fields.isActive : null;
      if (!areaId || !name || active === null) return invalid();
      ({ data, error } = await supabase.rpc("admin_update_area", { p_id: areaId, p_name: name, p_is_active: active, p_expected: requiredExpected(fields), p_reason: reason }));
    } else if (action === "table") {
      const tableId = id(fields.id); const areaId = id(fields.areaId); const capacity = integer(fields.capacity, 1, 8); const status = typeof fields.status === "string" && tableStatuses.includes(fields.status as typeof tableStatuses[number]) ? fields.status : null; const description = text(fields.description, 500); const active = typeof fields.isActive === "boolean" ? fields.isActive : null;
      if (!tableId || !areaId || capacity === null || !status || !description || active === null) return invalid();
      ({ data, error } = await supabase.rpc("admin_update_table", { p_id: tableId, p_area_id: areaId, p_capacity: capacity, p_status: status, p_description: description, p_is_active: active, p_expected: requiredExpected(fields), p_reason: reason }));
    } else if (action === "category") {
      const categoryId = id(fields.id); const name = text(fields.name, 120); const sortOrder = integer(fields.sortOrder, 0, 100000); const active = typeof fields.isActive === "boolean" ? fields.isActive : null;
      if (!categoryId || !name || sortOrder === null || active === null) return invalid();
      ({ data, error } = await supabase.rpc("admin_update_menu_category", { p_id: categoryId, p_name: name, p_sort_order: sortOrder, p_is_active: active, p_expected: requiredExpected(fields), p_reason: reason }));
    } else if (action === "menu-item") {
      const itemId = id(fields.id); const categoryId = id(fields.categoryId); const name = text(fields.name, 160); const description = text(fields.description, 500); const price = finiteNumber(fields.price); const imagePath = fields.imagePath === null || fields.imagePath === "" ? null : text(fields.imagePath, 200); const available = typeof fields.isAvailable === "boolean" ? fields.isAvailable : null; const active = typeof fields.isActive === "boolean" ? fields.isActive : null; const featured = typeof fields.isFeatured === "boolean" ? fields.isFeatured : null; const sortOrder = integer(fields.sortOrder, 0, 100000);
      if (!itemId || !categoryId || !name || !description || price === null || imagePath === undefined || available === null || active === null || featured === null || sortOrder === null) return invalid();
      ({ data, error } = await supabase.rpc("admin_update_menu_item", { p_id: itemId, p_category_id: categoryId, p_name: name, p_description: description, p_price: price, p_image_path: imagePath, p_is_available: available, p_is_active: active, p_is_featured: featured, p_sort_order: sortOrder, p_expected: requiredExpected(fields), p_reason: reason }));
    } else if (action === "profile") {
      const profileId = id(fields.id); const role = typeof fields.role === "string" && roles.includes(fields.role as typeof roles[number]) ? fields.role : null; const active = typeof fields.isActive === "boolean" ? fields.isActive : null;
      if (!profileId || !role || active === null) return invalid();
      ({ data, error } = await supabase.rpc("admin_update_profile", { p_id: profileId, p_role: role, p_is_active: active, p_expected: requiredExpected(fields), p_reason: reason }));
    } else {
      return invalid("Thao tác Admin không được phép.");
    }
    if (error) return NextResponse.json({ message: adminErrorMessage(new Error(error.message ?? "ADMIN_MUTATION_FAILED")) }, { status: error.code === "42501" ? 403 : 409, headers });
    return NextResponse.json({ ok: true, data }, { headers });
  } catch (error) {
    if (error instanceof IdentityError) return NextResponse.json({ message: error.status === 401 ? "Vui lòng đăng nhập tài khoản Admin." : "Tài khoản không có quyền quản trị." }, { status: error.status, headers });
    if (error instanceof SyntaxError) return invalid("JSON không hợp lệ.");
    return NextResponse.json({ message: "Chưa thể hoàn tất thao tác quản trị." }, { status: 503, headers });
  }
}
