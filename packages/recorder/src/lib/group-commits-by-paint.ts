import type { CommittedFiberChange } from "@react-record/devtools-api";

type GroupCommitsByPaintInput = {
  fiberChangesByCommit: CommittedFiberChange[][];
  paintCommitIndices: number[];
};

export function groupCommitsByPaint({
  fiberChangesByCommit,
  paintCommitIndices,
}: GroupCommitsByPaintInput): CommittedFiberChange[][][] {
  if (fiberChangesByCommit.length === 0) {
    return [];
  }

  const lastCommitIndex = fiberChangesByCommit.length - 1;
  const paintSegmentEndIndices = [...paintCommitIndices];

  if (paintSegmentEndIndices.at(-1) !== lastCommitIndex) {
    paintSegmentEndIndices.push(lastCommitIndex);
  }

  const paintSegmentRanges = paintSegmentEndIndices.map((paintEndIndex, index) => ({
    startIndex: index === 0 ? 0 : paintSegmentEndIndices[index - 1] + 1,
    endIndex: paintEndIndex + 1,
  }));

  return paintSegmentRanges
    .map(({ startIndex, endIndex }) =>
      fiberChangesByCommit
        .slice(startIndex, endIndex)
        .filter((commitChanges) => commitChanges.length > 0),
    )
    .filter((paintFiberChanges) => paintFiberChanges.length > 0);
}
