import type { CommitFiberChange } from "devtools-api";
import { createSafeJsonReplacer, formatElementSummary, isElementLike } from "./safeJson";

type CommitEntry = {
  componentName: string;
  hookIndex: number;
  prev: unknown;
  next: unknown;
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

function buildCommitEntries(fiberChangesByCommit: CommitFiberChange[][]): Map<number, CommitEntry[]> {
  const entriesByCommit = new Map<number, CommitEntry[]>();

  fiberChangesByCommit.forEach((commitChanges, commitIndex) => {
    const nextEntries: CommitEntry[] = [];

    commitChanges.forEach(({ changeDescription, displayName }) => {
      if (displayName == null) {
        return;
      }

      const changedHooks = changeDescription.hooks;
      if (changedHooks == null || changedHooks.length === 0) {
        return;
      }

      changedHooks
        .slice()
        .sort((left, right) => left.hookIndex - right.hookIndex)
        .forEach((hook) => {
          nextEntries.push({
            componentName: displayName,
            hookIndex: hook.hookIndex,
            prev: hook.prev,
            next: hook.next,
          });
        });
    });

    if (nextEntries.length > 0) {
      entriesByCommit.set(commitIndex, nextEntries);
    }
  });

  return entriesByCommit;
}

export function formatCommitHookChangedHistoryForLLM(
  fiberChangesByCommit: CommitFiberChange[][],
): string {
  const commitEntries = buildCommitEntries(fiberChangesByCommit);
  const commitIndices = Array.from(commitEntries.keys()).sort((left, right) => left - right);
  const componentNames = Array.from(
    new Set(
      fiberChangesByCommit.flatMap((commitChanges) =>
        commitChanges
          .map(({ displayName, changeDescription }) =>
            displayName != null &&
            changeDescription.hooks != null &&
            changeDescription.hooks.length > 0
              ? displayName
              : null,
          )
          .filter((componentName): componentName is string => componentName != null),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));
  const totalChangeCount = commitIndices.reduce((sum, commitIndex) => {
    return sum + (commitEntries.get(commitIndex) ?? []).length;
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
      `- Hook change events: ${entries.length}`,
    );

    entries.forEach(({ componentName, hookIndex, prev, next }) => {
      lines.push(`- Component ${componentName}, Hook ${hookIndex}`);
      lines.push(`  - ${formatValueForLLM(prev)} -> ${formatValueForLLM(next)}`);
    });
  });

  return lines.join("\n");
}
