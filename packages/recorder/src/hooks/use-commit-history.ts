import { buildCommitHistory } from "../lib/build-commit-history";
import { useMemo } from "preact/hooks";

import { buildCommitHistoryByPaint } from "../lib/format/build-commit-history-by-paint";
import { groupCommitsByPaint } from "../lib/group-commits-by-paint";
import { formatCommitHistoryForLLM } from "../lib/format/format-commit-history-for-llm";
import type { CommitHistoryFormatOptions } from "@/types";
import { useRecorderStore } from "../store";

type UseCommitHistoryResult = {
  commitCount: number;
  commitHistoryText: string;
  commitHistoryTextByPaint: string[];
};

export function useCommitHistory({
  includeRenderDuration,
  includeHookPath,
  includeSource,
}: CommitHistoryFormatOptions): UseCommitHistoryResult {
  const { state } = useRecorderStore();

  return useMemo(() => {
    const fiberChangeGroupsByPaint = groupCommitsByPaint({
      fiberChangesByCommit: state.fiberChanges,
      paintCommitIndices: state.paintCommitIndices,
    }).map((commits) => buildCommitHistory(commits, state.sourceResults));

    const fiberChanges = fiberChangeGroupsByPaint.flat();

    return {
      commitCount: fiberChanges.length,
      commitHistoryText: formatCommitHistoryForLLM(fiberChanges, {
        includeRenderDuration,
        includeHookPath,
        includeSource,
      }),
      commitHistoryTextByPaint: buildCommitHistoryByPaint({
        fiberChangesByPaint: fiberChangeGroupsByPaint,
        includeRenderDuration,
        includeHookPath,
        includeSource,
      }),
    };
  }, [state, includeRenderDuration, includeHookPath, includeSource]);
}
