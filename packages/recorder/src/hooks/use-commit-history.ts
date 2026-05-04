import { useEffect, useMemo, useState } from "preact/hooks";

import { buildFilteredCommits } from "../lib/build-filtered-commits";
import { buildHookChangedHistory } from "../lib/build-hook-changed-history";
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

  const {
    availableComponentNames,
    commitCount,
    commitHistoryText,
    commitSegmentsByPaint,
    hookHistoryText,
    matchingComponents,
    commitHistoryWithPaintText,
  } = useMemo(() => {
    const { filteredFiberChanges, filteredPaintCommitIndices } = buildFilteredCommits({
      fiberChanges: state.fiberChanges,
      paintCommitIndices: state.paintCommitIndices,
    });
    const filteredHookChangedHistory = buildHookChangedHistory(filteredFiberChanges);

    const availableComponentNames = getComponentNamesFromHistory(filteredHookChangedHistory);
    const matchingComponents = getMatchingComponentNames(
      filteredHookChangedHistory,
      componentNameFilter,
    );
    const componentFilteredHookHistory = filterHookChangedHistoryByComponent(
      filteredHookChangedHistory,
      componentNameFilter,
    );
    const componentFilteredFiberChanges = filterFiberChangesByComponent(
      filteredFiberChanges,
      componentNameFilter,
    );
    const commitSegmentsByPaint = buildCommitSegmentsByPaint({
      componentNameFilter,
      fiberChanges: filteredFiberChanges,
      paintCommitIndices: filteredPaintCommitIndices,
    });
    const componentFilteredFiberChangesPreservingIndices =
      filterFiberChangesByComponentPreservingCommitIndices(
        filteredFiberChanges,
        componentNameFilter,
      );
    const rerenderCountLines = buildRerenderCountLines(
      componentFilteredFiberChangesPreservingIndices,
    );

    return {
      availableComponentNames,
      commitCount: filteredFiberChanges.length,
      commitHistoryText: formatCommitHookChangedHistoryForLLM(componentFilteredFiberChanges, {
        extraSummaryLines: rerenderCountLines,
      }),
      hookHistoryText: formatHookChangedHistoryForLLM(componentFilteredHookHistory, {
        extraSummaryLines: rerenderCountLines,
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
