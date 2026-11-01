import type { CommitHistoryFormatOptions } from "@/features/options/recording-option";
import type {
  CommitHistoryLines,
  HookChangeSummary,
  HistoryLine,
  MountedGroup,
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
    case "parent-rendered":
      return "The parent component rendered.";
  }
}

function printDurationSuffix(selfDuration: number, options: CommitHistoryFormatOptions): string {
  return options.includeRenderDuration ? ` (${formatDurationMsInline(selfDuration)})` : "";
}

function printMountedGroup(group: MountedGroup, options: CommitHistoryFormatOptions): string {
  const countText = group.count >= 2 ? `×${group.count}` : "";
  const durationSuffix = printDurationSuffix(group.selfDuration, options);
  return `${formatDisplayName(group.displayName)}${countText}${durationSuffix}`;
}

// hook lines nest under the "• Hooks changed:" reason only while that reason is printed
function printHookIndent(underHooksReason: boolean, options: CommitHistoryFormatOptions): string {
  return underHooksReason && options.includeAllRenders ? "  " : "";
}

function printLines(line: HistoryLine, options: CommitHistoryFormatOptions): string[] {
  switch (line.kind) {
    case "commit":
      return ["", `## Commit ${line.commitNumber}`];
    case "no-hook-changes":
      return options.includeAllRenders ? [] : ["(no hook changes)"];
    case "mounted": {
      if (!options.includeAllRenders) return [];
      const groups = line.components.map((group) => printMountedGroup(group, options));
      return [`- Mounted (${line.instanceCount}): ${groups.join(", ")}`];
    }
    case "component": {
      if (!line.hookChanged && !options.includeAllRenders) return [];
      const durationSuffix = printDurationSuffix(line.selfDuration, options);
      return [`- ${formatDisplayName(line.displayName)}${durationSuffix}:`];
    }
    case "hook": {
      const ancestorPathText = options.includeHookPath
        ? formatAncestorPath(line.ancestorPath)
        : null;
      const label =
        ancestorPathText == null ? line.hookName : `${line.hookName} (in ${ancestorPathText})`;
      return [
        `${printHookIndent(line.underHooksReason, options)}  - hook[${line.hookIndex}] ${label}: ${printChangeSummary(line.changeSummary)}`,
      ];
    }
    case "render-reason":
      return options.includeAllRenders ? [`  ${printRenderReason(line.reason)}`] : [];
    case "field":
      return [
        `${printHookIndent(line.underHooksReason, options)}      ${line.path}: ${formatValueForLLM(line.prev)} → ${formatValueForLLM(line.next)}`,
      ];
    case "source":
      return options.includeSource
        ? [
            `${printHookIndent(line.underHooksReason, options)}    Source: ${formatHookSource(line.source)}`,
          ]
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
    `${summary.commitCount} commits, ${summary.renderedComponentCount} components rendered (${summary.mountedComponentCount} mounted)`,
    `${formatDurationMsInline(summary.totalDurationMs)} total render time`,
    // each history line expands to zero or more text lines depending on options
    ...historyLines.lines.flatMap((line) => printLines(line, options)),
  ].join("\n");
}
