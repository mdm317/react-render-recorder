import { buildCommitHistoryByPaint } from "@/features/commit-history/build-commit-history";
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
}: CommitHistoryFormatOptions): UseCommitHistoryResult {
  const {
    state: { fiberChanges, paintCommitIndices, sourceResults, projectRoot },
  } = useRecorderStore();

  const { historyLines, historyLinesByPaint } = useMemo(() => {
    const commitHistoryByPaint = buildCommitHistoryByPaint({
      fiberChanges,
      paintCommitIndices,
      sourceResults,
      projectRoot,
    });
    return {
      historyLines: buildCommitHistoryLines(commitHistoryByPaint.flat()),
      historyLinesByPaint: commitHistoryByPaint.map(buildCommitHistoryLines),
    };
  }, [fiberChanges, paintCommitIndices, sourceResults, projectRoot]);

  return useMemo(() => {
    const options = { includeRenderDuration, includeHookPath, includeSource };
    return {
      commitCount: historyLines.summary.commitCount,
      commitHistoryText: printCommitHistory(historyLines, options),
      commitHistoryTextByPaint: historyLinesByPaint.map((paintHistoryLines) =>
        printCommitHistory(paintHistoryLines, options),
      ),
    };
  }, [historyLines, historyLinesByPaint, includeRenderDuration, includeHookPath, includeSource]);
}
