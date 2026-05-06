import { useMemo } from "preact/hooks";

import { buildFilteredCommits } from "../lib/build-filtered-commits";
import { buildCommitHistoryTextByPaint } from "../lib/build-commit-segments-by-paint";
import { formatCommitHookChangedHistoryForLLM } from "../lib/llm-logging/format-commit-hook-changed-history-for-llm";
import { useRecorderStore } from "../store";

type UseCommitHistoryOptions = {
  includeRerenderCount?: boolean;
};

type UseCommitHistoryResult = {
  commitCount: number;
  commitHistoryText: string;
  commitHistoryTextByPaint: string[];
};

export function useCommitHistory({
  includeRerenderCount = true,
}: UseCommitHistoryOptions = {}): UseCommitHistoryResult {
  const { state } = useRecorderStore();

  return useMemo(() => {
    const { filteredFiberChanges, filteredPaintCommitIndices } = buildFilteredCommits({
      fiberChanges: state.fiberChanges,
      paintCommitIndices: state.paintCommitIndices,
    });
    return {
      commitCount: filteredFiberChanges.length,
      commitHistoryText: formatCommitHookChangedHistoryForLLM(filteredFiberChanges, {
        includeRerenderCount,
      }),
      commitHistoryTextByPaint: buildCommitHistoryTextByPaint({
        fiberChanges: filteredFiberChanges,
        paintCommitIndices: filteredPaintCommitIndices,
      }),
    };
  }, [state, includeRerenderCount]);
}
