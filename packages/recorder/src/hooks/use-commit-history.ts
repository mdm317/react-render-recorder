import { useEffect, useMemo, useState } from "preact/hooks";

import {
  filterFiberChangesByComponent,
  filterFiberChangesByComponentPreservingCommitIndices,
  filterHookChangedHistoryByComponent,
  getComponentNamesFromHistory,
  getMatchingComponentNames,
} from "../lib/component-filter";
import {
  buildCommitSegmentsByPaint,
  buildCommitHistoryWithPaintText,
  type CommitSegmentByPaint,
} from "../lib/build-commit-segments-by-paint";
import {
  buildCommitTimingSummaries,
  buildPaintTimingSummaries,
  buildPaintTimingSummaryLines,
  buildTimingSummaryLines,
} from "../lib/build-commit-timings";
import { buildRerenderCountLines } from "../lib/build-rerender-counts";
import {
  formatCommitHookChangedHistoryForLLM,
  formatHookChangedHistoryForLLM,
} from "../lib/llm-logging";
import { useRecorderStore } from "../store";

type UseCommitHistoryFilterResult = {
  availableComponentNames: string[];
  commitCount: number;
  commitHistoryText: string;
  componentNameFilter: string;
  commitSegmentsByPaint: CommitSegmentByPaint[];
  hookHistoryText: string;
  matchingComponents: string[];
  commitHistoryWithPaintText: string;
  setComponentNameFilter: (value: string) => void;
};

export function useCommitHistory(): UseCommitHistoryFilterResult {
  const { state } = useRecorderStore();
  const [componentNameFilter, setComponentNameFilter] = useState("");

  useEffect(() => {
    if (state.isRecording) {
      setComponentNameFilter("");
    }
  }, [state.isRecording]);

  const commitCount = state.fiberChanges.length;
  const {
    availableComponentNames,
    commitHistoryText,
    commitSegmentsByPaint,
    hookHistoryText,
    matchingComponents,
    commitHistoryWithPaintText,
  } = useMemo(() => {
    const availableComponentNames = getComponentNamesFromHistory(state.hookChangedHistory);
    const matchingComponents = getMatchingComponentNames(
      state.hookChangedHistory,
      componentNameFilter,
    );
    const filteredHookHistory = filterHookChangedHistoryByComponent(
      state.hookChangedHistory,
      componentNameFilter,
    );
    const filteredFiberChanges = filterFiberChangesByComponent(
      state.fiberChanges,
      componentNameFilter,
    );
    const rawCommitSegmentsByPaint = buildCommitSegmentsByPaint({
      componentNameFilter,
      fiberChanges: state.fiberChanges,
      paintCommitIndices: state.paintCommitIndices,
    });
    const filteredFiberChangesPreservingIndices =
      filterFiberChangesByComponentPreservingCommitIndices(
        state.fiberChanges,
        componentNameFilter,
      );
    const commitTimingSummaries = buildCommitTimingSummaries(filteredFiberChangesPreservingIndices);
    const paintTimingSummaries = buildPaintTimingSummaries({
      commitTimingSummaries,
      paintCommitIndices: state.paintCommitIndices,
    });
    const rerenderCountLines = buildRerenderCountLines(filteredFiberChangesPreservingIndices);
    const timingSummaryLines = buildTimingSummaryLines(commitTimingSummaries);
    const summaryLinesForFormatters = [...rerenderCountLines, ...timingSummaryLines];

    const paintSummaryByNumber = new Map<number, string[]>();
    for (const summary of paintTimingSummaries) {
      paintSummaryByNumber.set(summary.paintNumber, buildPaintTimingSummaryLines(summary));
    }

    const commitSegmentsByPaint = rawCommitSegmentsByPaint.map((segment) => {
      const summaryLines = paintSummaryByNumber.get(segment.paintNumber) ?? [];
      if (summaryLines.length === 0) {
        return segment;
      }
      return {
        ...segment,
        text: `${summaryLines.join("\n")}\n\n${segment.text}`,
      };
    });

    return {
      availableComponentNames,
      commitHistoryText: formatCommitHookChangedHistoryForLLM(filteredFiberChanges, {
        extraSummaryLines: summaryLinesForFormatters,
      }),
      hookHistoryText: formatHookChangedHistoryForLLM(filteredHookHistory, {
        extraSummaryLines: summaryLinesForFormatters,
      }),
      matchingComponents,
      commitSegmentsByPaint,
      commitHistoryWithPaintText: buildCommitHistoryWithPaintText(commitSegmentsByPaint),
    };
  }, [componentNameFilter, state]);

  return {
    availableComponentNames,
    commitCount,
    commitHistoryText,
    componentNameFilter,
    commitSegmentsByPaint,
    hookHistoryText,
    matchingComponents,
    commitHistoryWithPaintText,
    setComponentNameFilter,
  };
}
