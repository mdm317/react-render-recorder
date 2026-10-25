import { buildCommitHistoryGroups } from "@/lib/build-commit-history";
import { useMemo } from "preact/hooks";

import { buildCommitHistoryByPaint } from "@/lib/format/build-commit-history-by-paint";
import { formatCommitHistoryForLLM } from "@/lib/format/format-commit-history-for-llm";
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
