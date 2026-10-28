import { resolveHookSources } from "@/features/commit-history/resolve-hook-sources";
import { groupNonEmptyCommitsByPaint } from "@/features/commit-history/group-non-empty-commits-by-paint";
import { useMemo } from "preact/hooks";

import { buildCommitHistoryLines } from "@/features/commit-history/lines/build-commit-history-lines";
import { printCommitHistory } from "@/features/commit-history/print/print-commit-history";
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
  includeAllRenders,
}: CommitHistoryFormatOptions): UseCommitHistoryResult {
  const {
    state: { fiberChanges, paintCommitIndices, sourceResults, projectRoot },
  } = useRecorderStore();

  const { historyLines, historyLinesByPaint } = useMemo(() => {
    const commitHistoryByPaint = groupNonEmptyCommitsByPaint({
      fiberChangesByCommit: resolveHookSources(fiberChanges, { sourceResults, projectRoot }),
      paintCommitIndices,
    });
    return {
      historyLines: buildCommitHistoryLines(commitHistoryByPaint.flat()),
      historyLinesByPaint: commitHistoryByPaint.map(buildCommitHistoryLines),
    };
  }, [fiberChanges, paintCommitIndices, sourceResults, projectRoot]);

  return useMemo(() => {
    const options = { includeRenderDuration, includeHookPath, includeSource, includeAllRenders };
    return {
      commitCount: historyLines.summary.commitCount,
      commitHistoryText: printCommitHistory(historyLines, options),
      commitHistoryTextByPaint: historyLinesByPaint.map((paintHistoryLines) =>
        printCommitHistory(paintHistoryLines, options),
      ),
    };
  }, [
    historyLines,
    historyLinesByPaint,
    includeRenderDuration,
    includeHookPath,
    includeSource,
    includeAllRenders,
  ]);
}
