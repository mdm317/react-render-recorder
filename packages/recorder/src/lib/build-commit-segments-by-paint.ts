import type { CommittedFiberChange } from "@react-record/devtools-api";

import type { CommitFormatOptions } from "./llm-logging/types";
import { buildSummaryLines } from "./llm-logging/util/build-summary-lines";
import { getCommitSectionLines } from "./llm-logging/util/format-commit-section";

type BuildCommitHistoryTextByPaintInput = CommitFormatOptions & {
  fiberChanges: CommittedFiberChange[][];
  paintCommitIndices: number[];
};

export function buildCommitHistoryTextByPaint({
  fiberChanges,
  paintCommitIndices,
  includeRenderDuration = false,
  includeHookPath = false,
}: BuildCommitHistoryTextByPaintInput): string[] {
  const paintCommitSet = new Set(paintCommitIndices);
  const paintTexts: string[] = [];
  let currentCommits: CommittedFiberChange[][] = [];
  let currentLines: string[] = [];

  const flush = () => {
    const summaryLines = buildSummaryLines(currentCommits);
    paintTexts.push(["## Summary", ...summaryLines, "", ...currentLines].join("\n"));
    currentCommits = [];
    currentLines = [];
  };

  fiberChanges.forEach((commit, commitIndex) => {
    if (currentLines.length > 0) currentLines.push("");
    currentCommits.push(commit);
    currentLines.push(
      `## Commit ${commitIndex + 1}`,
      ...getCommitSectionLines(commit, { includeRenderDuration, includeHookPath }),
    );

    if (paintCommitSet.has(commitIndex)) {
      flush();
    }
  });

  if (currentLines.length > 0) {
    flush();
  }

  return paintTexts;
}
