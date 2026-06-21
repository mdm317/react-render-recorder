import type { CommittedFiberChange } from "@react-record/devtools-api";
import type { RecorderOptions } from "@/types";
import { buildSummaryLines } from "./util/build-summary-lines";
import { getCommitSectionLines } from "./util/format-commit-section";

export function formatCommitHookChangedHistoryForLLM(
  fiberChangesByCommit: CommittedFiberChange[][],
  options: RecorderOptions,
): string {
  const lines: string[] = ["## Summary", ...buildSummaryLines(fiberChangesByCommit)];

  fiberChangesByCommit.forEach((fiberChanges, commitIndex) => {
    lines.push("", `## Commit ${commitIndex + 1}`, ...getCommitSectionLines(fiberChanges, options));
  });

  return lines.join("\n");
}
