import { NextRequest, NextResponse } from "next/server";
import { parseAvailability } from "@/lib/booking-input";
import { bookingError } from "@/lib/booking";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: NextRequest) {
  const input = parseAvailability({ startsAt: request.nextUrl.searchParams.get("startsAt"), guests: Number(request.nextUrl.searchParams.get("guests")) });
  if (!input) return NextResponse.json({ message: "Ngày, giờ hoặc số khách không hợp lệ." }, { status: 400, headers });
  if (!getSupabaseConfig()) return NextResponse.json({ message: "Chưa cấu hình dịch vụ tìm bàn." }, { status: 503, headers });
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("find_available_tables", { p_starts_at: input.startsAt, p_guest_count: input.guests });
    if (error) { const result = bookingError(error); return NextResponse.json({ message: result.status === 503 ? "Dịch vụ tìm bàn chưa sẵn sàng. Chưa có xác nhận bàn trống." : result.message }, { status: result.status, headers }); }
    // Explicit projection, even if the RPC is later extended.
    const tables = (data as { table_id: string; table_code: string; area_code: string; capacity: number }[]).map(table => ({ table_id: table.table_id, table_code: table.table_code, area_code: table.area_code, capacity: table.capacity }));
    return NextResponse.json({ tables }, { headers });
  } catch { return NextResponse.json({ message: "Không thể kiểm tra bàn lúc này. Chưa có xác nhận bàn trống." }, { status: 503, headers }); }
}
