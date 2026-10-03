import { NextRequest, NextResponse } from "next/server";
import { IdentityError, requireRole } from "@/lib/identity";
import { getApplicationOrigin } from "@/lib/supabase/origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { comboImagePaths, validComboComponents } from "@/lib/combo-types";
import { liveCombosEnabled } from "@/lib/combos.server";

const headers = { "Cache-Control": "private, no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = ["id","code","name","description","guestCount","price","components","imagePath","isActive","isAvailable","sortOrder","expectedVersion","reason"];
const string = (value: unknown, min: number, max: number) => typeof value === "string" && value.trim().length >= min && value.length <= max;
const integer = (value: unknown, min: number, max: number) => typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

export async function POST(request: NextRequest) {
  const reply = (message: string, status: number) => NextResponse.json({ message }, { status, headers });
  if (request.headers.get("origin") !== getApplicationOrigin(request)) return reply("Yêu cầu khác nguồn bị từ chối.",403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return reply("Yêu cầu cần JSON.",415);
  try {
    await requireRole(["admin"]);
    if (!liveCombosEnabled()) return reply("Combo live chưa được bật sau migration và xác minh backup.",503);
    const raw = await request.text();
    if (raw.length > 24000) return reply("Yêu cầu quá dài.",413);
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return reply("Dữ liệu không hợp lệ.",400);
    const row = value as Record<string, unknown>;
    if (Object.keys(row).length !== fields.length || fields.some(key => !Object.hasOwn(row,key)) || Object.keys(row).some(key => !fields.includes(key))
      || !(row.id === null || typeof row.id === "string" && uuid.test(row.id))
      || typeof row.code !== "string" || !/^MV-CB[0-9]{2,4}$/.test(row.code)
      || !string(row.name,1,160) || !string(row.description,0,500) || !string(row.reason,1,500)
      || !integer(row.guestCount,1,100) || !integer(row.price,0,1000000000) || !integer(row.sortOrder,0,100000)
      || typeof row.isActive !== "boolean" || typeof row.isAvailable !== "boolean" || !validComboComponents(row.components)
      || !(row.imagePath === null || comboImagePaths.some(path => path === row.imagePath))
      || !(row.id === null ? row.expectedVersion === null : integer(row.expectedVersion,1,2147483646))) return reply("Kiểm tra các trường combo, số lượng và lý do.",400);
    const db = await createSupabaseServerClient();
    const { data, error } = await db.rpc("admin_save_combo", {
      p_id: row.id,p_code: row.code,p_name: row.name,p_description: row.description,p_guest_count: row.guestCount,
      p_price: row.price,p_components: row.components,p_image_path: row.imagePath,p_is_active: row.isActive,
      p_is_available: row.isAvailable,p_sort_order: row.sortOrder,p_expected_version: row.expectedVersion,p_reason: row.reason,
    });
    if (error) return reply(error.code === "42501" ? "Không có quyền Admin." : "Không thể lưu: dữ liệu đã thay đổi, mã trùng hoặc thành phần không hợp lệ. Tải lại trước khi thử lại.",error.code === "42501" ? 403 : 409);
    return NextResponse.json({ ok:true,data },{ headers });
  } catch (error) {
    if (error instanceof IdentityError) return reply("Cần phiên Admin active.",error.status);
    return reply(error instanceof SyntaxError ? "JSON không hợp lệ." : "Chưa thể tải dịch vụ combo.",error instanceof SyntaxError ? 400 : 503);
  }
}
