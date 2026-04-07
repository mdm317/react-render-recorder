import type { HookChangedHistory } from "../lib/buildHookChangedHistory";
import { createSafeJsonReplacer, formatElementSummary, isElementLike } from "./safeJson";

function isFormattedElementSummaryString(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("[HTMLElement ") && value.endsWith("]");
}

function formatValueForLLM(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  if (isFormattedElementSummaryString(value)) {
    return value;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return JSON.stringify(value);
  }

  if (isElementLike(value)) {
    return formatElementSummary(value);
  }

  const serialized = JSON.stringify(value, createSafeJsonReplacer());
  return serialized ?? String(value);
}

export function formatHookChangedHistoryForLLM(hookChangedHistory: HookChangedHistory): string {
  const componentNames = Object.keys(hookChangedHistory).sort((left, right) =>
    left.localeCompare(right),
  );

  const totalHookCount = componentNames.reduce((count, componentName) => {
    return count + Object.keys(hookChangedHistory[componentName] ?? {}).length;
  }, 0);

  const totalChangeCount = componentNames.reduce((count, componentName) => {
    return (
      count +
      Object.values(hookChangedHistory[componentName] ?? {}).reduce(
        (sum, entries) => sum + entries.length,
        0,
      )
    );
  }, 0);

  const lines = [
    "Hook change history summary",
    `- Components with hook changes: ${componentNames.length}`,
    `- Distinct changed hooks: ${totalHookCount}`,
    `- Total hook change events: ${totalChangeCount}`,
    "- Commit indices are zero-based.",
  ];

  if (componentNames.length === 0) {
    lines.push("- No hook changes were recorded.");
    return lines.join("\n");
  }

  componentNames.forEach((componentName) => {
    const indexedHooks = hookChangedHistory[componentName] ?? {};
    const hookIndices = Object.keys(indexedHooks)
      .map(Number)
      .sort((left, right) => left - right);

    lines.push("", `Component ${componentName}`);

    hookIndices.forEach((hookIndex) => {
      const entries = indexedHooks[hookIndex] ?? [];
      const commitIndices = entries.map(({ commitIndex }) => commitIndex);

      lines.push(
        `- Hook ${hookIndex} changed ${entries.length} time(s) across commit(s): ${commitIndices.join(", ")}`,
      );

      entries.forEach(({ commitIndex, prev, next }) => {
        lines.push(
          `  - Commit ${commitIndex}: ${formatValueForLLM(prev)} -> ${formatValueForLLM(next)}`,
        );
      });
    });
  });

  return lines.join("\n");
}
