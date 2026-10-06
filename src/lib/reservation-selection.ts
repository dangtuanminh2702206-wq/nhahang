import type { RestaurantFloor } from "@/data/restaurant";

export function resolveReservationSelection(
  floors: readonly RestaurantFloor[],
  requestedFloor: string | null,
  requestedTable: string | null,
): { floorSlug: string; tableCode: string } | null {
  const floor = floors.find((item) => item.slug === requestedFloor)
    ?? floors.find((item) => item.tables.length > 0);
  if (!floor) return null;

  const table = floor.tables.find((item) => item.code === requestedTable) ?? floor.tables[0];
  return table ? { floorSlug: floor.slug, tableCode: table.code } : null;
}
