import type { CommittedFiberChange } from "@react-record/devtools-api";

import { getCommitSectionLines } from "./llm-logging/util/format-commit-section";

type BuildCommitHistoryTextByPaintInput = {
  fiberChanges: CommittedFiberChange[][];
  paintCommitIndices: number[];
};

export function buildCommitHistoryTextByPaint({
  fiberChanges,
  paintCommitIndices,
}: BuildCommitHistoryTextByPaintInput): string[] {
  if (paintCommitIndices.length === 0) return [];

  const paintCommitSet = new Set(paintCommitIndices);
  const paintTexts: string[] = [];
  let currentLines: string[] = [];

  fiberChanges.forEach((commit, commitIndex) => {
    if (currentLines.length > 0) currentLines.push("");
    currentLines.push(`## Commit ${commitIndex + 1}`, ...getCommitSectionLines(commit));

    if (paintCommitSet.has(commitIndex)) {
      paintTexts.push(currentLines.join("\n"));
      currentLines = [];
    }
  });

  if (currentLines.length > 0) {
    paintTexts.push(currentLines.join("\n"));
  }

  return paintTexts;
}
