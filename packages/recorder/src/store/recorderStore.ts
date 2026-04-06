import type { CommitFiberChange, RendererID } from "devtools-api";
import { CommitData } from "../core/types";

export type RecorderStoreState = {
  isRecording: boolean;
  commits: CommitData[];
  fiberChanges: CommitFiberChange[][];
};

export type RecorderStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => RecorderStoreState;
  recordCommit: (commit: CommitData & { changes: CommitFiberChange[] }) => void;
  setRecording: (value: boolean) => void;
  reset: () => void;
};

export type CreateRecorderStoreOptions = {
  maxRecentCommits?: number;
};

const DEFAULT_MAX_RECENT_COMMITS = 20;

function createRecorderStoreInstance(
  options: CreateRecorderStoreOptions = {},
): RecorderStore {
  const listeners = new Set<() => void>();
  const maxRecentCommits =
    options.maxRecentCommits ?? DEFAULT_MAX_RECENT_COMMITS;

  let state: RecorderStoreState = {
    isRecording: false,
    commits: [],
    fiberChanges: [],
  };

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

      setState({
        ...state,
        isRecording: value,
      });
    },

    reset() {
      setState({
        isRecording: false,
        commits: [],
        fiberChanges: [],
      });
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
