import type { CommitFiberChange, Fiber } from "devtools-api";
import { CommitData } from "../core/types";

type HookChange = NonNullable<
  NonNullable<CommitFiberChange["changeDescription"]["hooks"]>[number]
>;

export type HookHistoryEntry = HookChange & {
  commitIndex: number;
};

// key: displayName or displayName#instanceOrdinal when duplicate names exist
// value: hook changes indexed by hook index
export type HookChangedHistory = Record<string, HookIndexed>;

// key: changeDescription.hooks.hookIndex
// value: changed hook data history + commit index
export type HookIndexed = Record<number, HookHistoryEntry[]>;

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
  const historyByInstance = new Map<string, HookIndexed>();
  const instanceMetadata = new Map<
    string,
    {
      displayName: string;
      ordinal: number;
    }
  >();
  const displayNameInstanceCounts = new Map<string, number>();
  const fiberInstanceIds = new WeakMap<Fiber, string>();

  function getOrCreateInstanceId(
    displayName: string,
    fiber: Fiber,
    prevFiber: Fiber | null,
  ): string {
    const existingInstanceId =
      fiberInstanceIds.get(fiber) ??
      (prevFiber != null ? fiberInstanceIds.get(prevFiber) : undefined);

    if (existingInstanceId != null) {
      fiberInstanceIds.set(fiber, existingInstanceId);
      if (prevFiber != null) {
        fiberInstanceIds.set(prevFiber, existingInstanceId);
      }
      return existingInstanceId;
    }

    const ordinal = (displayNameInstanceCounts.get(displayName) ?? 0) + 1;
    displayNameInstanceCounts.set(displayName, ordinal);

    const instanceId = `${displayName}::${ordinal}`;
    instanceMetadata.set(instanceId, {
      displayName,
      ordinal,
    });
    fiberInstanceIds.set(fiber, instanceId);
    if (prevFiber != null) {
      fiberInstanceIds.set(prevFiber, instanceId);
    }
    return instanceId;
  }

  fiberChanges.forEach((commitChanges, commitIndex) => {
    commitChanges.forEach(({ changeDescription, displayName, fiber, prevFiber }) => {
      if (displayName == null) {
        return;
      }

      const changedHooks = changeDescription.hooks;
      if (changedHooks == null || changedHooks.length === 0) {
        return;
      }

      const instanceId = getOrCreateInstanceId(displayName, fiber, prevFiber);
      const indexedHooks = historyByInstance.get(instanceId) ?? {};

      changedHooks.forEach((hook) => {
        const hookHistory = indexedHooks[hook.hookIndex] ?? [];

        hookHistory.push({
          ...hook,
          commitIndex,
        });

        indexedHooks[hook.hookIndex] = hookHistory;
      });

      historyByInstance.set(instanceId, indexedHooks);
    });
  });

  const history: HookChangedHistory = {};

  historyByInstance.forEach((indexedHooks, instanceId) => {
    const metadata = instanceMetadata.get(instanceId);
    if (metadata == null) {
      return;
    }

    const hasDuplicateNames =
      (displayNameInstanceCounts.get(metadata.displayName) ?? 0) > 1;
    const historyKey = hasDuplicateNames
      ? `${metadata.displayName}#${metadata.ordinal}`
      : metadata.displayName;

    history[historyKey] = indexedHooks;
  });

  return history;
}

function createRecorderStoreInstance(
  options: CreateRecorderStoreOptions = {},
): RecorderStore {
  const listeners = new Set<() => void>();
  
  // oxlint-disable-next-line no-unused-vars todo
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
