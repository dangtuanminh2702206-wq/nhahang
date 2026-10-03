export type OrderInputItem = { kind: "dish" | "combo"; code: string; quantity: number };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const code = /^MV-[A-Z0-9-]{1,30}$/;
export function parseOrderItems(value: unknown): OrderInputItem[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return null;
  const seen = new Set<string>();
  const result: OrderInputItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (Object.keys(row).sort().join(",") !== "code,kind,quantity" || (row.kind !== "dish" && row.kind !== "combo") || typeof row.code !== "string" || !code.test(row.code) || typeof row.quantity !== "number" || !Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.quantity > 2147483647) return null;
    const key = `${row.kind}:${row.code}`;
    if (seen.has(key)) return null;
    seen.add(key);
    result.push({ kind: row.kind, code: row.code, quantity: row.quantity });
  }
  return result;
}
export function validOrderRequestId(value: unknown): value is string { return typeof value === "string" && uuid.test(value); }
export function validOrderId(value: unknown): value is string { return typeof value === "string" && uuid.test(value); }
