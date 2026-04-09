import { useEffect, useState } from "preact/hooks";

import {
  filterFiberChangesByComponent,
  filterHookChangedHistoryByComponent,
  getComponentNamesFromHistory,
  getMatchingComponentNames,
} from "../lib/component-filter";
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
  hookHistoryText: string;
  setComponentNameFilter: (value: string) => void;
  showNoMatchMessage: boolean;
};

export function useCommitHistoryFilter(): UseCommitHistoryFilterResult {
  const { state } = useRecorderStore();
  const [componentNameFilter, setComponentNameFilter] = useState("");

  useEffect(() => {
    if (state.isRecording) {
      setComponentNameFilter("");
    }
  }, [state.isRecording]);

  const availableComponentNames = getComponentNamesFromHistory(state.hookChangedHistory);
  const commitCount = state.commits.length;
  const hasComponentNameFilter = componentNameFilter.trim().length > 0;
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
  const hookHistoryText = formatHookChangedHistoryForLLM(filteredHookHistory);
  const commitHistoryText = formatCommitHookChangedHistoryForLLM(filteredFiberChanges);

  return {
    availableComponentNames,
    commitCount,
    commitHistoryText,
    componentNameFilter,
    hookHistoryText,
    setComponentNameFilter,
    showNoMatchMessage: hasComponentNameFilter && matchingComponents.length === 0,
  };
}
