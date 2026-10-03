export type ComboComponent = { label: string; quantity: number | null; menuCode: string | null };
export type ComboRecord = {
  id: string; code: string; name: string; description: string; guest_count: number;
  price: number; components: ComboComponent[]; image_path: string | null;
  is_active: boolean; is_available: boolean; sort_order: number; version: number;
};

export const comboImagePaths = [
  "/images/menu/combos/moc-duyen.webp", "/images/menu/combos/moc-gia.webp",
  "/images/menu/combos/moc-tinh.webp", "/images/menu/combos/moc-thuong.webp",
] as const;

export function validComboComponents(value: unknown): value is ComboComponent[] {
  return Array.isArray(value) && value.length >= 1 && value.length <= 40 && value.every((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const row = item as Record<string, unknown>;
    return Object.keys(row).length === 3 && typeof row.label === "string" && row.label.trim().length >= 1 && row.label.length <= 160
      && (row.quantity === null || typeof row.quantity === "number" && Number.isInteger(row.quantity) && row.quantity >= 1 && row.quantity <= 1000)
      && (row.menuCode === null || typeof row.menuCode === "string" && /^MV-[A-Z0-9-]{1,30}$/.test(row.menuCode));
  });
}
