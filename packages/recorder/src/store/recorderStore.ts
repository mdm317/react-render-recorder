import type { RendererID } from "devtools-api";

export type CommitRecord = {
  rendererID: RendererID;
  root: unknown;
  priorityLevel?: number;
  timestamp: number;
};

export type RecorderStoreSnapshot = {
  isRecording: boolean;
  commitCount: number;
  latestCommit: CommitRecord | null;
  recentCommits: CommitRecord[];
};

export type RecorderStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => RecorderStoreSnapshot;
  recordCommit: (commit: Omit<CommitRecord, "timestamp">) => void;
  setRecording: (value: boolean) => void;
  reset: () => void;
};

export type CreateRecorderStoreOptions = {
  initialRecording?: boolean;
  maxRecentCommits?: number;
};

const DEFAULT_MAX_RECENT_COMMITS = 20;

export function createRecorderStore(
  options: CreateRecorderStoreOptions = {},
): RecorderStore {
  const listeners = new Set<() => void>();
  const maxRecentCommits = options.maxRecentCommits ?? DEFAULT_MAX_RECENT_COMMITS;

  let snapshot: RecorderStoreSnapshot = {
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

  function setSnapshot(nextSnapshot: RecorderStoreSnapshot) {
    snapshot = nextSnapshot;
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
      return snapshot;
    },

    recordCommit(commit) {
      if (!snapshot.isRecording) {
        return;
      }

      const nextCommit: CommitRecord = {
        ...commit,
        timestamp: Date.now(),
      };

      setSnapshot({
        ...snapshot,
        commitCount: snapshot.commitCount + 1,
        latestCommit: nextCommit,
        recentCommits: [nextCommit, ...snapshot.recentCommits].slice(0, maxRecentCommits),
      });
    },

    setRecording(value) {
      if (snapshot.isRecording === value) {
        return;
      }

      setSnapshot({
        ...snapshot,
        isRecording: value,
      });
    },

    reset() {
      setSnapshot({
        ...snapshot,
        commitCount: 0,
        latestCommit: null,
        recentCommits: [],
      });
    },
  };
}
