import type { CommitFiberChange } from "devtools-api";
import { CommitData } from "../core/types";

type HookChange = NonNullable<
  NonNullable<CommitFiberChange["changeDescription"]["hooks"]>[number]
>;

export type HookHistoryEntry = HookChange & {
  commitIndex: number;
};

// key: displayName
// value: hook changes indexed by hook index
export type HookChangedHistory = Record<string, HookIndexed>;

// key: changeDescription.hooks.hookIndex
// value: changed hook data + commit index
export type HookIndexed = Record<number, HookHistoryEntry>;

export type RecorderStoreState = {
  isRecording: boolean;
  commits: CommitData[];
  fiberChanges: CommitFiberChange[][];
  hookChangedHistory: HookChangedHistory;
};

export type RecorderStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => RecorderStoreState;
  recordCommit: (commit: CommitData & { changes: CommitFiberChange[] }) => void;
  setRecording: (value: boolean) => void;
  reset: () => void;
};

export type CreateRecorderStoreOptions = {
  initialRecording?: boolean;
  maxRecentCommits?: number;
};

const DEFAULT_MAX_RECENT_COMMITS = 20;

function createInitialState(isRecording = false): RecorderStoreState {
  return {
    isRecording,
    commits: [],
    fiberChanges: [],
    hookChangedHistory: {},
  };
}

function buildHookChangedHistory(
  fiberChanges: CommitFiberChange[][],
): HookChangedHistory {
  const history: HookChangedHistory = {};

  fiberChanges.forEach((commitChanges, commitIndex) => {
    commitChanges.forEach(({ changeDescription, displayName }) => {
      if (displayName == null) {
        return;
      }

      const changedHooks = changeDescription.hooks;
      if (changedHooks == null || changedHooks.length === 0) {
        return;
      }

      const indexedHooks = history[displayName] ?? {};

      changedHooks.forEach((hook) => {
        indexedHooks[hook.hookIndex] = {
          ...hook,
          commitIndex,
        };
      });

      history[displayName] = indexedHooks;
    });
  });

  return history;
}

function createRecorderStoreInstance(
  options: CreateRecorderStoreOptions = {},
): RecorderStore {
  const listeners = new Set<() => void>();
  const maxRecentCommits =
    options.maxRecentCommits ?? DEFAULT_MAX_RECENT_COMMITS;

  let state: RecorderStoreState = createInitialState(options.initialRecording);

  function emit() {
    for (const listener of listeners) {
      listener();
    }
  }

  function setState(nextState: RecorderStoreState) {
    state = nextState;
    emit();
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

    recordCommit({ changes, ...args }) {
      if (!state.isRecording) {
        return;
      }

      state.commits.push(args);
      state.fiberChanges.push(changes);
    },

    setRecording(value) {
      if (state.isRecording === value) {
        return;
      }

      if (value) {
        setState(createInitialState(true));
        return;
      }

      setState({
        ...state,
        isRecording: value,
        hookChangedHistory: buildHookChangedHistory(state.fiberChanges),
      });
    },

    reset() {
      setState(createInitialState());
    },
  };
}

let recorderStoreSingleton: RecorderStore | null = null;

export function createRecorderStore(
  options: CreateRecorderStoreOptions = {},
): RecorderStore {
  if (recorderStoreSingleton == null) {
    recorderStoreSingleton = createRecorderStoreInstance(options);
  }

  return recorderStoreSingleton;
}
