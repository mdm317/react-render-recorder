import type { CommitHistoryFiberChange } from "../build-commit-history";

import type { CommitHistoryFormatOptions } from "@/types";
import { buildSummaryLines } from "./util/build-summary-lines";
import { buildCommitSectionLines } from "./util/build-commit-section";

type BuildCommitHistoryTextByPaintInput = CommitHistoryFormatOptions & {
  fiberChangesByPaint: CommitHistoryFiberChange[][][];
};

export function buildCommitHistoryByPaint({
  fiberChangesByPaint,
  includeRenderDuration,
  includeHookPath,
  includeSource,
}: BuildCommitHistoryTextByPaintInput): string[] {
  const paintTexts: string[] = [];
  let commitIndex = 0;

  for (const paintFiberChanges of fiberChangesByPaint) {
    const currentLines: string[] = [];

    for (const commit of paintFiberChanges) {
      if (currentLines.length > 0) currentLines.push("");
      currentLines.push(
        `## Commit ${commitIndex + 1}`,
        ...buildCommitSectionLines(commit, {
          includeRenderDuration,
          includeHookPath,
          includeSource,
        }),
      );
      commitIndex += 1;
    }

    paintTexts.push([...buildSummaryLines(paintFiberChanges), "", ...currentLines].join("\n"));
  }

  return paintTexts;
}
