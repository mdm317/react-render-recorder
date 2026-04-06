import type { CommitFiberChange, RendererID } from "devtools-api";

export type CommitRecord = {
  changes?: CommitFiberChange[];
  rendererID: RendererID;
  root: unknown;
  priorityLevel?: number;
  timestamp: number;
};

export type RecorderStoreState = {
  isRecording: boolean;
  commitCount: number;
  latestCommit: CommitRecord | null;
  recentCommits: CommitRecord[];
};

export type RecorderStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => RecorderStoreState;
  recordCommit: (commit: Omit<CommitRecord, "timestamp">) => void;
  setRecording: (value: boolean) => void;
  reset: () => void;
};

export type CreateRecorderStoreOptions = {
  initialRecording?: boolean;
  maxRecentCommits?: number;
};

const DEFAULT_MAX_RECENT_COMMITS = 20;

function createRecorderStoreInstance(options: CreateRecorderStoreOptions = {}): RecorderStore {
  const listeners = new Set<() => void>();
  const maxRecentCommits = options.maxRecentCommits ?? DEFAULT_MAX_RECENT_COMMITS;

  let state: RecorderStoreState = {
    isRecording: options.initialRecording ?? false,
    commitCount: 0,
    latestCommit: null,
    recentCommits: [],
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

    recordCommit(commit) {
      if (!state.isRecording) {
        return;
      }

      const nextCommit: CommitRecord = {
        ...commit,
        timestamp: Date.now(),
      };

      setState({
        ...state,
        commitCount: state.commitCount + 1,
        latestCommit: nextCommit,
        recentCommits: [nextCommit, ...state.recentCommits].slice(0, maxRecentCommits),
      });
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
        ...state,
        commitCount: 0,
        latestCommit: null,
        recentCommits: [],
      });
    },
  };
}

let recorderStoreSingleton: RecorderStore | null = null;

export function createRecorderStore(options: CreateRecorderStoreOptions = {}): RecorderStore {
  if (recorderStoreSingleton == null) {
    recorderStoreSingleton = createRecorderStoreInstance(options);
  }

  return recorderStoreSingleton;
}
