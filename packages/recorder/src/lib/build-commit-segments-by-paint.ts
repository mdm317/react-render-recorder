import type { CommittedFiberChange } from "@react-record/devtools-api";

import type { RecorderOptions } from "@/types";
import { buildSummaryLines } from "./llm-logging/util/build-summary-lines";
import { getCommitSectionLines } from "./llm-logging/util/format-commit-section";

type BuildCommitHistoryTextByPaintInput = RecorderOptions & {
  fiberChangesByPaint: CommittedFiberChange[][][];
};

export function buildCommitHistoryTextByPaint({
  fiberChangesByPaint,
  includeRenderDuration,
  includeHookPath,
}: BuildCommitHistoryTextByPaintInput): string[] {
  const paintTexts: string[] = [];
  let commitIndex = 0;

  for (const paintFiberChanges of fiberChangesByPaint) {
    const currentLines: string[] = [];

    for (const commit of paintFiberChanges) {
      if (currentLines.length > 0) currentLines.push("");
      currentLines.push(
        `## Commit ${commitIndex + 1}`,
        ...getCommitSectionLines(commit, { includeRenderDuration, includeHookPath }),
      );
      commitIndex += 1;
    }

    paintTexts.push(
      ["## Summary", ...buildSummaryLines(paintFiberChanges), "", ...currentLines].join("\n"),
    );
  }

  return paintTexts;
}
