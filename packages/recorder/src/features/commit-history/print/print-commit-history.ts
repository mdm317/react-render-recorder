import type { CommitHistoryFormatOptions } from "@/features/options/recording-option";
import type {
  CommitHistoryLines,
  HookChangeSummary,
  HistoryLine,
  RenderReason,
} from "@/features/commit-history/lines/build-commit-history-lines";
import { formatDurationMsInline } from "@/utils/format-duration";
import { formatAncestorPath, formatDisplayName, formatHookSource } from "./format-label";
import { formatHookValue, formatValueForLLM } from "./format-value";

function printChangeSummary(changeSummary: HookChangeSummary): string {
  switch (changeSummary.kind) {
    case "replaced":
      return `${formatHookValue(changeSummary.prev)} → ${formatHookValue(changeSummary.next)}`;
    case "changed-fields":
      return "changed fields:";
    case "equal":
      return "(equal)";
  }
}

// a reason as a group-line label; keys follow a " (a, b)" style
function printGroupReason(reason: RenderReason): string {
  switch (reason.kind) {
    case "first-mount":
      return "Mounted";
    case "context-changed":
      return reason.keys == null
        ? "Context changed"
        : `Context changed (${reason.keys.join(", ")})`;
    case "hooks-changed":
      return "Hooks changed";
    case "props-changed":
      return `Props changed (${reason.keys.join(", ")})`;
    case "state-changed":
      return `State changed (${reason.keys.join(", ")})`;
    case "parent-rendered":
      return "Parent rendered";
  }
}

// same wording as react-devtools-shared Profiler/WhatChanged.js; keys follow its " (a, b)" style
function printRenderReason(reason: RenderReason): string {
  switch (reason.kind) {
    case "context-changed":
      return reason.keys == null
        ? "• Context changed"
        : `• Context changed: (${reason.keys.join(", ")})`;
    case "hooks-changed":
      if (reason.hookCount === 0) return "• Hooks changed";
      return reason.hookCount === 1 ? "• Hook changed:" : "• Hooks changed:";
    case "props-changed":
      return `• Props changed: (${reason.keys.join(", ")})`;
    case "state-changed":
      return `• State changed: (${reason.keys.join(", ")})`;
    case "first-mount":
    case "parent-rendered":
      return `• ${printGroupReason(reason)}`;
  }
}

function printDurationSuffix(selfDuration: number, options: CommitHistoryFormatOptions): string {
  return options.includeRenderDuration ? ` (${formatDurationMsInline(selfDuration)})` : "";
}

// "Props changed (onFocus): FocusGuard×2 (0.12ms), Row"; hidden unless every render is listed
function printRenderGroup(
  line: Extract<HistoryLine, { kind: "render-group" }>,
  options: CommitHistoryFormatOptions,
): string[] {
  if (!options.includeAllRenders) return [];
  const label = line.reasons.map(printGroupReason).join(" + ");
  const members = line.components.map(({ displayName, count, selfDuration }) => {
    const countSuffix = count > 1 ? `×${count}` : "";
    return `${formatDisplayName(displayName)}${countSuffix}${printDurationSuffix(selfDuration, options)}`;
  });
  return [`${label}: ${members.join(", ")}`];
}

function printLines(line: HistoryLine, options: CommitHistoryFormatOptions): string[] {
  // hook lines nest under the "• Hooks changed:" reason when every render is listed
  const hookIndent = options.includeAllRenders ? "  " : "";
  switch (line.kind) {
    case "commit":
      return ["", `## Commit ${line.commitNumber}`];
    case "no-hook-changes":
      return options.includeAllRenders ? [] : ["(no hook changes)"];
    case "component":
      return [
        `- ${formatDisplayName(line.displayName)}${printDurationSuffix(line.selfDuration, options)}:`,
      ];
    case "render-group":
      return printRenderGroup(line, options);
    case "hook": {
      const ancestorPathText = options.includeHookPath
        ? formatAncestorPath(line.ancestorPath)
        : null;
      const label =
        ancestorPathText == null ? line.hookName : `${line.hookName} (in ${ancestorPathText})`;
      return [
        `${hookIndent}  - hook[${line.hookIndex}] ${label}: ${printChangeSummary(line.changeSummary)}`,
      ];
    }
    case "render-reason":
      return options.includeAllRenders ? [`  ${printRenderReason(line.reason)}`] : [];
    case "field":
      return [
        `${hookIndent}      ${line.path}: ${formatValueForLLM(line.prev)} → ${formatValueForLLM(line.next)}`,
      ];
    case "source":
      return options.includeSource
        ? [`${hookIndent}    Source: ${formatHookSource(line.source)}`]
        : [];
  }
}

export function printCommitHistory(
  historyLines: CommitHistoryLines,
  options: CommitHistoryFormatOptions,
): string {
  const { summary } = historyLines;
  return [
    "## Summary",
    `${summary.commitCount} commits, ${summary.renderedComponentCount} components rendered`,
    `${formatDurationMsInline(summary.totalDurationMs)} total render time`,
    // each history line expands to zero or more text lines depending on options
    ...historyLines.lines.flatMap((line) => printLines(line, options)),
  ].join("\n");
}
