export function isPlainArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
