import type { CommittedFiberChange } from "devtools-api";
import { createSafeJsonReplacer, formatElementSummary, isElementLike } from "../../utils/safe-json";

type CommitEntry = {
  componentName: string;
  hookIndex: number;
  hookName?: string | null;
  hookPath?: Array<string> | null;
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

function buildCommitEntries(
  fiberChangesByCommit: CommittedFiberChange[][],
): Map<number, CommitEntry[]> {
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
            hookName: hook.hookName ?? null,
            hookPath: hook.hookPath ?? null,
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
  fiberChangesByCommit: CommittedFiberChange[][],
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

    entries.forEach(({ componentName, hookIndex, hookName, hookPath, prev, next }) => {
      const hookLabel =
        hookPath != null && hookPath.length > 0
          ? `${hookIndex} (${hookPath.join(" > ")})`
          : hookName != null
            ? `${hookIndex} (${hookName})`
            : String(hookIndex);

      lines.push(`- Component ${componentName}, Hook ${hookLabel}`);
      lines.push(`  - ${formatValueForLLM(prev)} -> ${formatValueForLLM(next)}`);
    });
  });

  return lines.join("\n");
}
