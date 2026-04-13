import type { CommittedFiberChange } from "@react-record/devtools-api";

import { filterFiberChangesByComponentPreservingCommitIndices } from "./component-filter";
import { formatCommitHookChangedHistoryForLLM } from "./llm-logging";

export type CommitSegmentByPaint = {
  endCommitIndex: number;
  id: string;
  paintNumber: number;
  startCommitIndex: number;
  text: string;
};

type BuildCommitSegmentsByPaintInput = {
  componentNameFilter: string;
  fiberChanges: CommittedFiberChange[][];
  paintCommitIndices: number[];
};

function formatPaintChunkCommitHistory(fiberChangesByCommit: CommittedFiberChange[][]): string {
  const text = formatCommitHookChangedHistoryForLLM(fiberChangesByCommit);
  const firstCommitIndex = text.search(/^Commit \d+/m);

  if (firstCommitIndex === -1) {
    return "변경된 commit 데이터가 없습니다.";
  }

  return text.slice(firstCommitIndex);
}

export function buildCommitSegmentsByPaint({
  componentNameFilter,
  fiberChanges,
  paintCommitIndices,
}: BuildCommitSegmentsByPaintInput): CommitSegmentByPaint[] {
  const commitLimit = fiberChanges.length;

  if (paintCommitIndices.length === 0) {
    return [];
  }

  const commitSegmentsByPaint: CommitSegmentByPaint[] = [];
  const filteredFiberChanges = filterFiberChangesByComponentPreservingCommitIndices(
    fiberChanges,
    componentNameFilter,
  );
  let startCommitIndex = 0;

  paintCommitIndices.forEach((paintCommitIndex, paintIndex) => {
    commitSegmentsByPaint.push({
      endCommitIndex: paintCommitIndex,
      id: `paint-${paintIndex + 1}-${startCommitIndex}-${paintCommitIndex}`,
      paintNumber: paintIndex + 1,
      startCommitIndex,
      text: formatPaintChunkCommitHistory(
        filteredFiberChanges.map((commitChanges, commitIndex) =>
          commitIndex >= startCommitIndex && commitIndex <= paintCommitIndex ? commitChanges : [],
        ),
      ),
    });

    startCommitIndex = paintCommitIndex + 1;
  });

  if (startCommitIndex < commitLimit) {
    commitSegmentsByPaint.push({
      endCommitIndex: commitLimit - 1,
      id: `after-paint-${startCommitIndex}-${commitLimit - 1}`,
      paintNumber: paintCommitIndices.length + 1,
      startCommitIndex,
      text: formatPaintChunkCommitHistory(
        filteredFiberChanges.map((commitChanges, commitIndex) =>
          commitIndex >= startCommitIndex && commitIndex < commitLimit ? commitChanges : [],
        ),
      ),
    });
  }

  return commitSegmentsByPaint;
}

export function buildCommitHistoryWithPaintText(
  commitSegmentsByPaint: CommitSegmentByPaint[],
): string {
  return commitSegmentsByPaint
    .map((segment) => {
      const startCommitLabel = segment.startCommitIndex + 1;
      const endCommitLabel = segment.endCommitIndex + 1;
      const commitLabel =
        startCommitLabel === endCommitLabel
          ? String(startCommitLabel)
          : `${startCommitLabel}-${endCommitLabel}`;

      return [
        `Paint ${segment.paintNumber}`,
        `Commit range: ${commitLabel}`,
        "Commit details:",
        segment.text,
      ].join("\n");
    })
    .join("\n\n");
}
