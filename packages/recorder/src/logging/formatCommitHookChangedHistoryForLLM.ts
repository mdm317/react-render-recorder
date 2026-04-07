import type { HookChangedHistory } from "../store/recorderStore";
import { createSafeJsonReplacer, formatElementSummary, isElementLike } from "./safeJson";

type CommitEntry = {
  componentName: string;
  hookIndex: number;
  changeCount: number;
  entries: HookChangedHistory[string][number];
};

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

function buildCommitEntries(hookChangedHistory: HookChangedHistory): Map<number, CommitEntry[]> {
  const entriesByCommit = new Map<number, CommitEntry[]>();

  Object.keys(hookChangedHistory)
    .sort((left, right) => left.localeCompare(right))
    .forEach((componentName) => {
      const indexedHooks = hookChangedHistory[componentName] ?? {};

      Object.keys(indexedHooks)
        .map(Number)
        .sort((left, right) => left - right)
        .forEach((hookIndex) => {
          const entries = indexedHooks[hookIndex] ?? [];
          const commitBuckets = new Map<number, typeof entries>();

          entries.forEach((entry) => {
            const commitEntries = commitBuckets.get(entry.commitIndex) ?? [];
            commitEntries.push(entry);
            commitBuckets.set(entry.commitIndex, commitEntries);
          });

          Array.from(commitBuckets.entries())
            .sort(([left], [right]) => left - right)
            .forEach(([commitIndex, commitEntries]) => {
              const nextEntries = entriesByCommit.get(commitIndex) ?? [];
              nextEntries.push({
                componentName,
                hookIndex,
                changeCount: commitEntries.length,
                entries: commitEntries,
              });
              entriesByCommit.set(commitIndex, nextEntries);
            });
        });
    });

  return entriesByCommit;
}

export function formatCommitHookChangedHistoryForLLM(
  hookChangedHistory: HookChangedHistory,
): string {
  const commitEntries = buildCommitEntries(hookChangedHistory);
  const commitIndices = Array.from(commitEntries.keys()).sort((left, right) => left - right);
  const componentNames = Object.keys(hookChangedHistory).sort((left, right) =>
    left.localeCompare(right),
  );
  const totalChangeCount = commitIndices.reduce((sum, commitIndex) => {
    return (
      sum +
      (commitEntries.get(commitIndex) ?? []).reduce((count, entry) => count + entry.changeCount, 0)
    );
  }, 0);

  const lines = [
    "Commit-oriented hook change history summary",
    `- Commits with hook changes: ${commitIndices.length}`,
    `- Components with hook changes: ${componentNames.length}`,
    `- Total hook change events: ${totalChangeCount}`,
    "- Commit indices are zero-based.",
  ];

  if (commitIndices.length === 0) {
    lines.push("- No hook changes were recorded.");
    return lines.join("\n");
  }

  commitIndices.forEach((commitIndex) => {
    const entries = commitEntries.get(commitIndex) ?? [];
    const components = new Set(entries.map(({ componentName }) => componentName));

    lines.push(
      "",
      `Commit ${commitIndex}`,
      `- Components with hook changes: ${components.size}`,
      `- Hook change events: ${entries.reduce((sum, entry) => sum + entry.changeCount, 0)}`,
    );

    entries.forEach(({ componentName, hookIndex, changeCount, entries }) => {
      lines.push(`- Component ${componentName}, Hook ${hookIndex}, change event(s): ${changeCount}`);

      entries.forEach(({ prev, next }) => {
        lines.push(`  - ${formatValueForLLM(prev)} -> ${formatValueForLLM(next)}`);
      });
    });
  });

  return lines.join("\n");
}
