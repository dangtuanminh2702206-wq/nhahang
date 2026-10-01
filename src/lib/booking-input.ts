export type AvailableTable = { table_id: string; table_code: string; area_code: string; capacity: number };
export type BookingInput = { startsAt: string; guests: number; tableId: string; idempotencyKey: string; name: string; phone: string; notes: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Transport validation only; time/capacity policy belongs to restaurant_settings/RPC.
export function parseAvailability(value: unknown): { startsAt: string; guests: number } | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.startsAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+07:00$/.test(input.startsAt)) return null;
  const date = new Date(input.startsAt);
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 19) !== input.startsAt.slice(0, 19)) return null;
  if (!Number.isSafeInteger(input.guests) || (input.guests as number) < 1 || (input.guests as number) > 32767) return null;
  return { startsAt: input.startsAt, guests: input.guests as number };
}

export function parseBooking(value: unknown): BookingInput | null {
  const slot = parseAvailability(value);
  if (!slot || !value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !["startsAt", "guests", "tableId", "idempotencyKey", "name", "phone", "notes"].includes(key))) return null;
  if (typeof input.tableId !== "string" || !uuid.test(input.tableId) || typeof input.idempotencyKey !== "string" || !uuid.test(input.idempotencyKey)) return null;
  if (typeof input.name !== "string" || !input.name.trim() || input.name.length > 120 || typeof input.phone !== "string" || !input.phone.trim() || input.phone.length > 32 || typeof input.notes !== "string" || input.notes.length > 1000) return null;
  return { ...slot, tableId: input.tableId, idempotencyKey: input.idempotencyKey, name: input.name.trim(), phone: input.phone.trim(), notes: input.notes };
}
