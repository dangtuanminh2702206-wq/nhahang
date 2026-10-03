import "server-only";
import { restaurantFloors, type RestaurantFloor } from "@/data/restaurant";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getLiveFloors(): Promise<RestaurantFloor[] | null> {
  if (!getSupabaseConfig()) return [...restaurantFloors];
  try {
    const client = await createSupabaseServerClient();
    const [areas, tables] = await Promise.all([
      client.from("areas").select("id,code,name").eq("is_active", true),
      client.from("tables").select("code,area_id,capacity,description").eq("is_active", true),
    ]);
    if (areas.error || tables.error) return null;
    return restaurantFloors.flatMap(floor => {
      const area = areas.data.find(item => item.code === floor.areaCode);
      if (!area) return [];
      return [{ ...floor, name: area.name, tables: floor.tables.flatMap(table => {
        const live = tables.data.find(item => item.code === table.code && item.area_id === area.id);
        return live ? [{ ...table, capacity: live.capacity, position: live.description, note: undefined }] : [];
      }) }];
    });
  } catch { return null; }
}
