import "server-only";
import { menuCombos, type MenuCombo } from "@/data/restaurant";
import type { ComboRecord } from "@/lib/combo-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function liveCombosEnabled() {
  return process.env.NEXT_PUBLIC_STATIC_DEMO !== "true" && process.env.COMBO_CATALOGUE_ENABLED === "true";
}

export async function getLiveCombos(): Promise<{ mode: "snapshot" | "live" | "error"; items: readonly MenuCombo[] }> {
  if (!liveCombosEnabled()) return { mode: "snapshot", items: menuCombos };
  try {
    const db = await createSupabaseServerClient();
    const { data, error } = await db.from("menu_combos").select("*").eq("is_active", true).order("sort_order").order("code").limit(501);
    if (error || !data || data.length > 500) return { mode: "error", items: [] };
    const items = (data as ComboRecord[]).map(row => ({
      code: row.code, name: row.name, description: row.description, guestCount: row.guest_count,
      price: Number(row.price), imagePath: row.image_path, available: row.is_available,
      items: row.components.map(item => item.quantity === null ? item.label : `${item.quantity} ${item.label}`),
    }));
    return { mode: "live", items };
  } catch { return { mode: "error", items: [] }; }
}
