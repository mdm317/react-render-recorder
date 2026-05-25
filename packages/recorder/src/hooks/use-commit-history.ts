import { useMemo } from "preact/hooks";

import { buildFilteredCommits } from "../lib/build-filtered-commits";
import { buildCommitHistoryTextByPaint } from "../lib/build-commit-segments-by-paint";
import { formatCommitHookChangedHistoryForLLM } from "../lib/llm-logging/format-commit-hook-changed-history-for-llm";
import type { CommitFormatOptions } from "../lib/llm-logging/types";
import { useRecorderStore } from "../store";

type UseCommitHistoryResult = {
  commitCount: number;
  commitHistoryText: string;
  commitHistoryTextByPaint: string[];
};

export function useCommitHistory({
  includeRenderDuration = false,
  includeHookPath = false,
}: CommitFormatOptions = {}): UseCommitHistoryResult {
  const { state } = useRecorderStore();

  return useMemo(() => {
    const { filteredFiberChanges, filteredPaintCommitIndices } = buildFilteredCommits({
      fiberChanges: state.fiberChanges,
      paintCommitIndices: state.paintCommitIndices,
    });
    return {
      commitCount: filteredFiberChanges.length,
      commitHistoryText: formatCommitHookChangedHistoryForLLM(filteredFiberChanges, {
        includeRenderDuration,
        includeHookPath,
      }),
      commitHistoryTextByPaint: buildCommitHistoryTextByPaint({
        fiberChanges: filteredFiberChanges,
        paintCommitIndices: filteredPaintCommitIndices,
        includeRenderDuration,
        includeHookPath,
      }),
    };
  }, [state, includeRenderDuration, includeHookPath]);
}
