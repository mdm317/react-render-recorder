import type { CommitHistoryFiberChange } from "@/lib/build-commit-history";
import type { CommitHistoryFormatOptions } from "@/features/options/recording-option";
import { buildSummaryLines } from "./util/build-summary-lines";
import { buildCommitSectionLines } from "./util/build-commit-section";

export function formatCommitHistoryForLLM(
  fiberChangesByCommit: CommitHistoryFiberChange[][],
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
