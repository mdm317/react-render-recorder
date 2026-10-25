import { useSyncExternalStore } from "preact/compat";
import { useMemo } from "preact/hooks";

import { useRecorderStore } from "@/features/recording/recorder-store";
import { commitHistoryViewStore } from "./commit-history-view-store";

export function useCommitHistoryViewStore() {
  const uiState = useSyncExternalStore(
    commitHistoryViewStore.subscribe,
    commitHistoryViewStore.getSnapshot,
  );
  const { state: recorderState } = useRecorderStore();
  const hasHistory = useMemo(
    () => recorderState.fiberChanges.some((commitChanges) => commitChanges.length > 0),
    [recorderState.fiberChanges],
  );

  return {
    ...uiState,
    hasCommitHistory: hasHistory,
    toggle: commitHistoryViewStore.toggle,
  };
}
