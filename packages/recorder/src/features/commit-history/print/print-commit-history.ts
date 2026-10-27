import type { CommitHistoryFormatOptions } from "@/features/options/recording-option";
import type {
  CommitHistoryLines,
  FormatOptionKey,
  HookChangeSummary,
  OptionGated,
  HistoryLine,
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

function printLines(line: HistoryLine, options: CommitHistoryFormatOptions): string[] {
  switch (line.kind) {
    case "commit":
      return ["", `## Commit ${line.commitNumber}`];
    case "no-hook-changes":
      return ["(no hook changes)"];
    case "component": {
      const durationText = valueIfEnabled(line.durationText, options);
      return [`- ${line.displayName}${durationText == null ? "" : ` (${durationText})`}:`];
    }
    case "hook": {
      const ancestorPathText = valueIfEnabled(line.ancestorPathText, options);
      const label =
        ancestorPathText == null ? line.hookName : `${line.hookName} (in ${ancestorPathText})`;
      return [`  - hook[${line.hookIndex}] ${label}: ${printChangeSummary(line.changeSummary)}`];
    }
    case "field":
      return [`      ${line.path}: ${line.prev} → ${line.next}`];
    case "source": {
      const sourceText = valueIfEnabled(line.sourceText, options);
      return sourceText == null ? [] : [`    Source: ${sourceText}`];
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
    `${summary.commitCount} commits, ${summary.rerenderedComponentCount} components rerendered`,
    `${summary.totalDurationText} total render time`,
    // each history line expands to zero or more text lines depending on options
    ...historyLines.lines.flatMap((line) => printLines(line, options)),
  ].join("\n");
}
