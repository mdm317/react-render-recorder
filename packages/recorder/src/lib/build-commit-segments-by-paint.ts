import type { CommittedFiberChange } from "@react-record/devtools-api";

import { buildSummaryLines } from "./llm-logging/util/build-summary-lines";
import { getCommitSectionLines } from "./llm-logging/util/format-commit-section";

type BuildCommitHistoryTextByPaintInput = {
  fiberChanges: CommittedFiberChange[][];
  paintCommitIndices: number[];
  includeRenderDuration?: boolean;
  includeRerenderCount?: boolean;
};

export function buildCommitHistoryTextByPaint({
  fiberChanges,
  paintCommitIndices,
  includeRenderDuration = false,
  includeRerenderCount = false,
}: BuildCommitHistoryTextByPaintInput): string[] {
  const paintCommitSet = new Set(paintCommitIndices);
  const paintTexts: string[] = [];
  let currentCommits: CommittedFiberChange[][] = [];
  let currentLines: string[] = [];

  const flush = () => {
    const summaryLines = buildSummaryLines(currentCommits, {
      includeRerenderCount,
      includeRenderDuration,
    });
    const segmentLines =
      summaryLines.length > 0 ? [...summaryLines, "", ...currentLines] : currentLines;
    paintTexts.push(segmentLines.join("\n"));
    currentCommits = [];
    currentLines = [];
  };

  fiberChanges.forEach((commit, commitIndex) => {
    if (currentLines.length > 0) currentLines.push("");
    currentCommits.push(commit);
    currentLines.push(`## Commit ${commitIndex + 1}`, ...getCommitSectionLines(commit));

    if (paintCommitSet.has(commitIndex)) {
      flush();
    }
  });

  if (currentLines.length > 0) {
    flush();
  }

  return paintTexts;
}
