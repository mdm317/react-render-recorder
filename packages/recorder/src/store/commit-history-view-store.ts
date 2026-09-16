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
