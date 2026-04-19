import type { HookChangedHistory } from "../build-hook-changed-history";
import { createSafeJsonReplacer, formatElementSummary, isElementLike } from "../../utils/safe-json";

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
    "- Commit numbers are one-based.",
  ];

  if (componentNames.length === 0) {
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
      const commitNumbers = entries.map(({ commitIndex }) => commitIndex + 1);
      const firstEntry = entries[0];
      const hookPath =
        firstEntry != null && "hookPath" in firstEntry ? firstEntry.hookPath ?? null : null;
      const hookName =
        firstEntry != null && "hookName" in firstEntry ? firstEntry.hookName ?? null : null;
      const hookLabel =
        hookPath != null && hookPath.length > 0
          ? `${hookIndex} (${hookPath.join(" > ")})`
          : hookName != null
            ? `${hookIndex} (${hookName})`
            : String(hookIndex);

      lines.push(
        `- Hook ${hookLabel} changed ${entries.length} time(s) across commit(s): ${commitNumbers.join(", ")}`,
      );

      entries.forEach(({ commitIndex, prev, next }) => {
        const commitNumber = commitIndex + 1;

        lines.push(
          `  - Commit ${commitNumber}: ${formatValueForLLM(prev)} -> ${formatValueForLLM(next)}`,
        );
      });
    });
  });

  return lines.join("\n");
}
