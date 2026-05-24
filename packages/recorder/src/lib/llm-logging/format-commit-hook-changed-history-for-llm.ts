import type { CommittedFiberChange } from "@react-record/devtools-api";
import { buildSummaryLines } from "./util/build-summary-lines";
import { getCommitSectionLines } from "./util/format-commit-section";

type FormatOptions = {
  includeRenderDuration?: boolean;
};

export function formatCommitHookChangedHistoryForLLM(
  fiberChangesByCommit: CommittedFiberChange[][],
  { includeRenderDuration = false }: FormatOptions = {},
): string {
  const lines: string[] = ["## Summary", ...buildSummaryLines(fiberChangesByCommit)];

  fiberChangesByCommit.forEach((fiberChanges, commitIndex) => {
    lines.push(
      "",
      `## Commit ${commitIndex + 1}`,
      ...getCommitSectionLines(fiberChanges, { includeRenderDuration }),
    );
  });

  return lines.join("\n");
}
