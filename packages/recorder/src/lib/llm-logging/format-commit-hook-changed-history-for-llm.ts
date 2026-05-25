import type { CommittedFiberChange } from "@react-record/devtools-api";
import type { CommitFormatOptions } from "./types";
import { buildSummaryLines } from "./util/build-summary-lines";
import { getCommitSectionLines } from "./util/format-commit-section";

export function formatCommitHookChangedHistoryForLLM(
  fiberChangesByCommit: CommittedFiberChange[][],
  { includeRenderDuration = false, includeHookPath = false }: CommitFormatOptions = {},
): string {
  const lines: string[] = ["## Summary", ...buildSummaryLines(fiberChangesByCommit)];

  fiberChangesByCommit.forEach((fiberChanges, commitIndex) => {
    lines.push(
      "",
      `## Commit ${commitIndex + 1}`,
      ...getCommitSectionLines(fiberChanges, { includeRenderDuration, includeHookPath }),
    );
  });

  return lines.join("\n");
}
