import { useMemo } from "preact/hooks";

import { buildCommitHistoryTextByPaint } from "../lib/build-commit-segments-by-paint";
import { groupCommitsByPaint } from "../lib/group-commits-by-paint";
import { formatCommitHookChangedHistoryForLLM } from "../lib/llm-logging/format-commit-hook-changed-history-for-llm";
import type { RecorderOptions } from "@/types";
import { useRecorderStore } from "../store";

type UseCommitHistoryResult = {
  commitCount: number;
  commitHistoryText: string;
  commitHistoryTextByPaint: string[];
};

export function useCommitHistory({
  includeRenderDuration,
  includeHookPath,
}: RecorderOptions): UseCommitHistoryResult {
  const { state } = useRecorderStore();

  return useMemo(() => {
    const fiberChangeGroupsByPaint = groupCommitsByPaint({
      fiberChangesByCommit: state.fiberChanges,
      paintCommitIndices: state.paintCommitIndices,
    });
    const fiberChanges = fiberChangeGroupsByPaint.flat();

    return {
      commitCount: fiberChanges.length,
      commitHistoryText: formatCommitHookChangedHistoryForLLM(fiberChanges, {
        includeRenderDuration,
        includeHookPath,
      }),
      commitHistoryTextByPaint: buildCommitHistoryTextByPaint({
        fiberChangesByPaint: fiberChangeGroupsByPaint,
        includeRenderDuration,
        includeHookPath,
      }),
    };
  }, [state, includeRenderDuration, includeHookPath]);
}
