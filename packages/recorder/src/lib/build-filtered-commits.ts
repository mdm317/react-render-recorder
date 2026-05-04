import type { CommittedFiberChange } from "@react-record/devtools-api";

export type FilteredCommits = {
  filteredFiberChanges: CommittedFiberChange[][];
  filteredPaintCommitIndices: number[];
};

type BuildFilteredCommitsInput = {
  fiberChanges: CommittedFiberChange[][];
  paintCommitIndices: number[];
};

export function buildFilteredCommits({
  fiberChanges,
  paintCommitIndices,
}: BuildFilteredCommitsInput): FilteredCommits {
  const filteredFiberChanges: CommittedFiberChange[][] = [];
  const rawToFilteredCommitIndex = new Map<number, number>();

  for (let rawIndex = 0; rawIndex < fiberChanges.length; rawIndex += 1) {
    const commitChanges = fiberChanges[rawIndex];
    if (commitChanges == null || commitChanges.length === 0) {
      continue;
    }

    rawToFilteredCommitIndex.set(rawIndex, filteredFiberChanges.length);
    filteredFiberChanges.push(commitChanges);
  }

  const filteredPaintCommitIndices: number[] = [];
  for (const rawPaintIndex of paintCommitIndices) {
    const filteredIndex = rawToFilteredCommitIndex.get(rawPaintIndex);
    if (filteredIndex == null) {
      continue;
    }
    filteredPaintCommitIndices.push(filteredIndex);
  }

  return {
    filteredFiberChanges,
    filteredPaintCommitIndices,
  };
}
