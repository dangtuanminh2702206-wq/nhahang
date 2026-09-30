"use client";

import { useState } from "react";
import type { RestaurantFloor, RestaurantTable, TableVisualState } from "@/data/restaurant";

type TableNodeProps = {
  table: RestaurantTable;
  state: TableVisualState;
  isSelected: boolean;
  onSelect: (table: RestaurantTable) => void;
};

export function TableNode({ table, state, isSelected, onSelect }: TableNodeProps) {
  return (
    <button
      type="button"
      className={`table-node table-node-${isSelected ? "selected" : state}`}
      style={{ left: `${table.planX}%`, top: `${table.planY}%` }}
      aria-pressed={isSelected}
      aria-label={`${table.code}, ${table.capacity} chỗ, ${table.position}${table.note ? `, ${table.note}` : ""}`}
      onClick={() => onSelect(table)}
    >
      <span>{table.code}</span>
      <small>{table.capacity} chỗ</small>
    </button>
  );
}

export function FloorPlan({ floor, tableState = "neutral" }: { floor: RestaurantFloor; tableState?: TableVisualState }) {
  const [selectedTable, setSelectedTable] = useState<RestaurantTable>(floor.tables[0]);
  return (
    <section className="floor-plan-section" aria-labelledby="floor-plan-heading">
      <div className="floor-plan-heading">
        <div>
          <p className="eyebrow">Sơ đồ tương tác</p>
          <h2 id="floor-plan-heading">Chọn một bàn để xem vị trí</h2>
        </div>
        <p className="floor-plan-status"><span aria-hidden="true" /> Trạng thái minh họa: chưa kết nối khả dụng</p>
      </div>
      <div className="floor-plan-scroll" tabIndex={0} aria-label={`Sơ đồ tầng ${floor.level}, cuộn ngang nếu cần`}>
        <div className="floor-plan-canvas">
          {floor.planLandmarks.map((landmark) => <span key={landmark.label} className={`plan-landmark ${landmark.className}`}>{landmark.label}</span>)}
          {floor.tables.map((table) => <TableNode key={table.code} table={table} state={tableState} isSelected={selectedTable.code === table.code} onSelect={setSelectedTable} />)}
        </div>
      </div>
      <aside className="selected-table" aria-live="polite">
        <p className="eyebrow">Bàn đang xem</p>
        <strong>{selectedTable.code}</strong>
        <span>{selectedTable.capacity} chỗ · {selectedTable.position}{selectedTable.note ? ` · ${selectedTable.note}` : ""}</span>
      </aside>
    </section>
  );
}
