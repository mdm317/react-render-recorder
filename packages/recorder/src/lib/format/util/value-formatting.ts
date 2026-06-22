import {
  createSafeJsonReplacer,
  formatElementSummary,
  isElementLike,
} from "../../../utils/safe-json";

function isFormattedElementSummaryString(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("[HTMLElement ") && value.endsWith("]");
}

function elementSummaryToShortForm(formatted: string): string {
  return `[${formatted.slice("[HTMLElement ".length, -1)}]`;
}

export function formatValueForLLM(value: unknown): string {
  if (value === undefined) return "undefined";
  if (isFormattedElementSummaryString(value)) return elementSummaryToShortForm(value);
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return JSON.stringify(value);
  }
  if (isElementLike(value)) return elementSummaryToShortForm(formatElementSummary(value));
  const serialized = JSON.stringify(value, createSafeJsonReplacer());
  return serialized ?? String(value);
}

function summarizeShallowValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "function") return "[Function]";
  if (typeof value === "string" && isFormattedElementSummaryString(value)) {
    return elementSummaryToShortForm(value);
  }
  if (isElementLike(value)) return elementSummaryToShortForm(formatElementSummary(value));
  if (Array.isArray(value)) return `[Array(${value.length})]`;
  if (typeof value === "object") return "[object]";
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "symbol") return value.toString();
  return JSON.stringify(value);
}

function formatShallowShape(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(summarizeShallowValue).join(", ")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.keys(value as Record<string, unknown>).map(
      (key) => `${key}: ${summarizeShallowValue((value as Record<string, unknown>)[key])}`,
    );
    return `{${entries.join(", ")}}`;
  }
  return formatValueForLLM(value);
}

// Non-element objects/arrays render as a one-level-deep shape; everything else via formatValueForLLM.
export function formatHookValue(value: unknown): string {
  if (typeof value === "object" && value !== null && !isElementLike(value)) {
    return formatShallowShape(value);
  }
  return formatValueForLLM(value);
}
