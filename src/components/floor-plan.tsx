"use client";

import { useState } from "react";
import type { RestaurantFloor, RestaurantTable, TableVisualState } from "@/data/restaurant";

type TableNodeProps = {
  table: RestaurantTable;
  state: TableVisualState;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: (table: RestaurantTable) => void;
};

export function TableNode({ table, state, isSelected, onSelect, disabled }: TableNodeProps) {
  return (
    <button
      type="button"
      className={`table-node table-node-${isSelected ? "selected" : state}`}
      style={{ left: `${table.planX}%`, top: `${table.planY}%` }}
      aria-pressed={isSelected}
      disabled={disabled}
      aria-label={`${table.code}, ${table.capacity} chỗ, ${table.position}${table.note ? `, ${table.note}` : ""}${state === "unavailable" ? ", không khả dụng" : state === "available" ? ", sẵn sàng tại lần kiểm tra" : state === "occupied" ? ", đang phục vụ" : state === "cleaning" ? ", cần dọn" : state === "out-of-service" ? ", tạm ngưng" : ""}`}
      onClick={() => onSelect(table)}
    >
      <span>{table.code}</span>
      <small>{table.capacity} chỗ</small>
    </button>
  );
}

type FloorPlanProps = {
  floor: RestaurantFloor;
  tableState?: TableVisualState;
  tableStates?: Partial<Record<string, TableVisualState>>;
  selectedCode?: string;
  onTableSelect?: (table: RestaurantTable) => void;
  availableCodes?: readonly string[];
};

export function FloorPlan({ floor, tableState = "neutral", selectedCode, onTableSelect, availableCodes, tableStates }: FloorPlanProps) {
  const [localSelection, setLocalSelection] = useState<RestaurantTable>(floor.tables[0]);
  const selectedTable = floor.tables.find((table) => table.code === (selectedCode ?? localSelection.code)) ?? floor.tables[0];
  function selectTable(table: RestaurantTable) {
    setLocalSelection(table);
    onTableSelect?.(table);
  }
  return (
    <section className="floor-plan-section" aria-labelledby="floor-plan-heading">
      <div className="floor-plan-heading">
        <div>
          <p className="eyebrow">Sơ đồ tương tác</p>
          <h2 id="floor-plan-heading">Chọn một bàn để xem vị trí</h2>
        </div>
        <p className="floor-plan-status"><span aria-hidden="true" /> {tableStates ? "Trạng thái vật lý tại lần tải · không phải lịch đặt tương lai" : availableCodes ? "Kết quả kiểm tra tạm thời · chưa giữ bàn" : "Trạng thái minh họa: chưa kết nối khả dụng"}</p>
      </div>
      <div className="floor-plan-scroll" tabIndex={0} aria-label={`Sơ đồ tầng ${floor.level}, cuộn ngang nếu cần`}>
        <div className="floor-plan-canvas">
          {floor.planLandmarks.map((landmark) => <span key={landmark.label} className={`plan-landmark ${landmark.className}`}>{landmark.label}</span>)}
          {floor.tables.map((table) => <TableNode key={table.code} table={table} state={availableCodes ? availableCodes.includes(table.code) ? "available" : "unavailable" : tableStates?.[table.code] ?? tableState} disabled={availableCodes !== undefined && !availableCodes.includes(table.code)} isSelected={selectedTable.code === table.code && (!availableCodes || availableCodes.includes(table.code))} onSelect={selectTable} />)}
        </div>
      </div>
      <aside className="selected-table" aria-live="polite">
        <p className="eyebrow">Bàn đang xem</p>
        <strong>{selectedTable.code}</strong>
        {tableStates && <span>{({ available: "Sẵn sàng", occupied: "Đang phục vụ", cleaning: "Cần dọn", "out-of-service": "Tạm ngưng", neutral: "Chưa có trạng thái", unavailable: "Không khả dụng", selected: "Đang chọn" })[tableStates[selectedTable.code] ?? "neutral"]}</span>}
        <span>{selectedTable.capacity} chỗ · {selectedTable.position}{selectedTable.note ? ` · ${selectedTable.note}` : ""}</span>
      </aside>
    </section>
  );
}
