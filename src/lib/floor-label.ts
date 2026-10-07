export function floorLabel(level: number, name: string): string {
  const label = name.trim();
  return new RegExp(`^Tầng\\s+${level}(?:\\s*[·:–-]|\\s*$)`, "i").test(label)
    ? label
    : `Tầng ${level} · ${label}`;
}
