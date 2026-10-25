import { buildCommitHistoryGroups } from "@/features/commit-history/build-commit-history";
import { useMemo } from "preact/hooks";

import { buildCommitHistoryByPaint } from "@/features/commit-history/format/build-commit-history-by-paint";
import { formatCommitHistoryForLLM } from "@/features/commit-history/format/format-commit-history-for-llm";
import type { CommitHistoryFormatOptions } from "@/features/options/recording-option";
import { useRecorderStore } from "@/features/recording/recorder-store";

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
    const fiberChangeGroupsByPaint = buildCommitHistoryGroups(state);

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
