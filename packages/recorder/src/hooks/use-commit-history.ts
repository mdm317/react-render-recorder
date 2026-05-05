import { useMemo } from "preact/hooks";

import { buildFilteredCommits } from "../lib/build-filtered-commits";
import {
  buildCommitSegmentsByPaint,
  buildCommitHistoryWithPaintText,
  type CommitSegmentByPaint,
} from "../lib/build-commit-segments-by-paint";
import { formatCommitHookChangedHistoryForLLM } from "../lib/llm-logging/format-commit-hook-changed-history-for-llm";
import { useRecorderStore } from "../store";

type UseCommitHistoryResult = {
  commitCount: number;
  commitHistoryText: string;
  commitSegmentsByPaint: CommitSegmentByPaint[];
  commitHistoryWithPaintText: string;
};

export function useCommitHistory(): UseCommitHistoryResult {
  const { state } = useRecorderStore();

  return useMemo(() => {
    const { filteredFiberChanges, filteredPaintCommitIndices } = buildFilteredCommits({
      fiberChanges: state.fiberChanges,
      paintCommitIndices: state.paintCommitIndices,
    });
    const commitSegmentsByPaint = buildCommitSegmentsByPaint({
      componentNameFilter: "",
      fiberChanges: filteredFiberChanges,
      paintCommitIndices: filteredPaintCommitIndices,
    });
    return {
      commitCount: filteredFiberChanges.length,
      commitHistoryText: formatCommitHookChangedHistoryForLLM(filteredFiberChanges),
      commitSegmentsByPaint,
      commitHistoryWithPaintText: buildCommitHistoryWithPaintText(commitSegmentsByPaint),
    };
  }, [state]);
}
