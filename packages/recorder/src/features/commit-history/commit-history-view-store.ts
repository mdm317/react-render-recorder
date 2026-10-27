import { useSyncExternalStore } from "preact/compat";
import { useMemo } from "preact/hooks";

import { useRecorderStore } from "@/features/recording/recorder-store";

export type CommitHistoryViewState = {
  isOpen: boolean;
};

export type CommitHistoryViewStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => CommitHistoryViewState;
  toggle: () => void;
};

export function createCommitHistoryViewStore(): CommitHistoryViewStore {
  const listeners = new Set<() => void>();
  let state: CommitHistoryViewState = { isOpen: true };

  function emit() {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot() {
      return state;
    },

    toggle() {
      state = { isOpen: !state.isOpen };
      emit();
    },
  };
}

export const commitHistoryViewStore = createCommitHistoryViewStore();

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
