import { connection } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function ServiceHours() {
  if (process.env.NEXT_PUBLIC_STATIC_DEMO === "true" || !getSupabaseConfig()) return <>10:00–22:00 · Mỗi ngày</>;
  await connection();
  try {
    const client = await createSupabaseServerClient();
    const { data, error } = await client.from("business_hours").select("weekday,opens_at,closes_at").order("weekday").order("opens_at");
    if (error) return "Chưa thể tải giờ phục vụ";
    const days = Array.from({ length: 7 }, (_, day) => data.filter(row => row.weekday === day).map(row => `${row.opens_at.slice(0, 5)}–${row.closes_at.slice(0, 5)}`).join(", ") || "Nghỉ");
    if (days.every(value => value === days[0])) return `${days[0]} · Mỗi ngày`;
    return days.map((value, day) => `${day === 0 ? "CN" : `T${day + 1}`}: ${value}`).join(" · ");
  } catch { return "Chưa thể tải giờ phục vụ"; }
}
