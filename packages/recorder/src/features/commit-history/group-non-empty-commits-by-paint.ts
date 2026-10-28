type GroupNonEmptyCommitsByPaintInput<T> = {
  fiberChangesByCommit: T[][];
  paintCommitIndices: number[];
};

export function groupNonEmptyCommitsByPaint<T>({
  fiberChangesByCommit,
  paintCommitIndices,
}: GroupNonEmptyCommitsByPaintInput<T>): T[][][] {
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
