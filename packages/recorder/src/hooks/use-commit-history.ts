import { useEffect, useMemo, useState } from "preact/hooks";

import {
  filterFiberChangesByComponent,
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

  const commitCount = state.commits.length;
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
    const commitSegmentsByPaint = buildCommitSegmentsByPaint({
      componentNameFilter,
      fiberChanges: state.fiberChanges,
      paintCommitIndices: state.paintCommitIndices,
    });

    return {
      availableComponentNames,
      commitHistoryText: formatCommitHookChangedHistoryForLLM(filteredFiberChanges),
      hookHistoryText: formatHookChangedHistoryForLLM(filteredHookHistory),
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
