"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { RestaurantFloor } from "@/data/restaurant";
import { resolveReservationSelection } from "@/lib/reservation-selection";

export function ReservationQuerySelection({ floors, onSelect }: {
  floors: readonly RestaurantFloor[];
  onSelect: (selection: { floorSlug: string; tableCode: string }) => void;
}) {
  const searchParams = useSearchParams();
  const requestedFloor = searchParams.get("floor");
  const requestedTable = searchParams.get("table");

  useEffect(() => {
    const selection = resolveReservationSelection(floors, requestedFloor, requestedTable);
    if (selection) onSelect(selection);
  }, [floors, onSelect, requestedFloor, requestedTable]);

  return null;
}
