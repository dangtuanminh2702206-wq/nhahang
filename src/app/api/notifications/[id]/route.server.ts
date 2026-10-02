import { NextRequest, NextResponse } from "next/server";
import { IdentityError, requireRole } from "@/lib/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getApplicationOrigin } from "@/lib/supabase/origin";

const headers = { "Cache-Control": "private, no-store" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (request.headers.get("origin") !== getApplicationOrigin(request)) {
    return NextResponse.json({ message: "Yêu cầu không hợp lệ." }, { status: 403, headers });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ message: "Yêu cầu cần định dạng JSON." }, { status: 415, headers });
  }
  const { id } = await context.params;
  if (!uuidPattern.test(id)) return NextResponse.json({ message: "Thông báo không hợp lệ." }, { status: 400, headers });
  try {
    const { user } = await requireRole(["customer"]);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("recipient_id", user.id)
      .select("id,read_at")
      .maybeSingle();
    if (error) return NextResponse.json({ message: "Chưa thể cập nhật thông báo." }, { status: 503, headers });
    if (!data) return NextResponse.json({ message: "Không tìm thấy thông báo." }, { status: 404, headers });
    return NextResponse.json({ notification: data }, { headers });
  } catch (error) {
    if (error instanceof IdentityError) return NextResponse.json({ message: "Vui lòng đăng nhập bằng tài khoản Customer." }, { status: error.status, headers });
    return NextResponse.json({ message: "Chưa thể cập nhật thông báo." }, { status: 503, headers });
  }
}
