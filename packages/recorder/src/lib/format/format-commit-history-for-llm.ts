import type { CommittedFiberChange } from "@react-record/devtools-api";
import type { CommitHistoryFormatOptions } from "@/types";
import { buildSummaryLines } from "./util/build-summary-lines";
import { buildCommitSectionLines } from "./util/build-commit-section";

export function formatCommitHistoryForLLM(
  fiberChangesByCommit: CommittedFiberChange[][],
  options: CommitHistoryFormatOptions,
): string {
  const lines: string[] = buildSummaryLines(fiberChangesByCommit);

  fiberChangesByCommit.forEach((fiberChanges, commitIndex) => {
    lines.push(
      "",
      `## Commit ${commitIndex + 1}`,
      ...buildCommitSectionLines(fiberChanges, options),
    );
  });

  return lines.join("\n");
}
