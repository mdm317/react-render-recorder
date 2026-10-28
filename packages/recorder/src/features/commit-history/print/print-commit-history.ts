import type { CommitHistoryFormatOptions } from "@/features/options/recording-option";
import type {
  CommitHistoryLines,
  FormatOptionKey,
  HookChangeSummary,
  OptionGated,
  HistoryLine,
  RenderReason,
} from "@/features/commit-history/lines/build-commit-history-lines";

function valueIfEnabled(
  gated: OptionGated<FormatOptionKey> | null,
  options: CommitHistoryFormatOptions,
): string | null {
  if (gated == null || !options[gated.option]) return null;
  return gated.value;
}

function printChangeSummary(changeSummary: HookChangeSummary): string {
  switch (changeSummary.kind) {
    case "replaced":
      return `${changeSummary.prev} → ${changeSummary.next}`;
    case "changed-fields":
      return "changed fields:";
    case "equal":
      return "(equal)";
  }
}

// same wording as react-devtools-shared Profiler/WhatChanged.js; keys follow its " (a, b)" style
function printRenderReason(reason: RenderReason): string {
  switch (reason.kind) {
    case "first-mount":
      return "This is the first time the component rendered.";
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

function printLines(line: HistoryLine, options: CommitHistoryFormatOptions): string[] {
  // hook lines nest under the "• Hooks changed:" reason when every render is listed
  const hookIndent = options.includeAllRenders ? "  " : "";
  switch (line.kind) {
    case "commit":
      return ["", `## Commit ${line.commitNumber}`];
    case "no-hook-changes":
      return options.includeAllRenders ? [] : ["(no hook changes)"];
    case "component": {
      if (!line.hookChanged && !options.includeAllRenders) return [];
      const durationText = valueIfEnabled(line.durationText, options);
      return [`- ${line.displayName}${durationText == null ? "" : ` (${durationText})`}:`];
    }
    case "hook": {
      const ancestorPathText = valueIfEnabled(line.ancestorPathText, options);
      const label =
        ancestorPathText == null ? line.hookName : `${line.hookName} (in ${ancestorPathText})`;
      return [
        `${hookIndent}  - hook[${line.hookIndex}] ${label}: ${printChangeSummary(line.changeSummary)}`,
      ];
    }
    case "render-reason":
      return options.includeAllRenders ? [`  ${printRenderReason(line.reason)}`] : [];
    case "field":
      return [`${hookIndent}      ${line.path}: ${line.prev} → ${line.next}`];
    case "source": {
      const sourceText = valueIfEnabled(line.sourceText, options);
      return sourceText == null ? [] : [`${hookIndent}    Source: ${sourceText}`];
    }
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
    `${summary.totalDurationText} total render time`,
    // each history line expands to zero or more text lines depending on options
    ...historyLines.lines.flatMap((line) => printLines(line, options)),
  ].join("\n");
}
