import type { CommittedFiberChange } from "@react-record/devtools-api";

import { CommitData } from "../core/types";
import {
  buildHookChangedHistory,
  type HookChangedHistory,
} from "../lib/build-hook-changed-history";

export type RecorderStoreState = {
  commits: CommitData[];
  fiberChanges: CommittedFiberChange[][];
  hookChangedHistory: HookChangedHistory;
  isRecording: boolean;
  paintCommitIndices: number[];
};

export type RecorderStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => RecorderStoreState;
  recordCommit: (commit: CommitData & { changes: CommittedFiberChange[] }) => void;
  recordPaint: () => void;
  setRecording: (value: boolean) => void;
  reset: () => void;
};

function createInitialState(): RecorderStoreState {
  return {
    commits: [],
    fiberChanges: [],
    hookChangedHistory: {},
    isRecording: false,
    paintCommitIndices: [],
  };
}

function createRecorderStoreInstance(): RecorderStore {
  const listeners = new Set<() => void>();
  let state: RecorderStoreState = createInitialState();

  function emit() {
    for (const listener of listeners) {
      listener();
    }
  }

  function setState(nextState: RecorderStoreState) {
    state = nextState;
    emit();
  }

  function startRecording() {
    setState({
      ...createInitialState(),
      isRecording: true,
    });
  }

  function endRecording() {
    setState({
      ...state,
      isRecording: false,
      hookChangedHistory: buildHookChangedHistory(state.fiberChanges),
    });
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

    recordPaint() {
      if (!state.isRecording || state.commits.length === 0) {
        return;
      }

      const paintCommitIndex = state.commits.length - 1;
      if (state.paintCommitIndices[state.paintCommitIndices.length - 1] === paintCommitIndex) {
        return;
      }

      state.paintCommitIndices.push(paintCommitIndex);
    },

    setRecording(value) {
      if (state.isRecording === value) {
        return;
      }

      if (value) {
        startRecording();
      } else {
        endRecording();
      }
    },

    reset() {
      setState(createInitialState());
    },
  };
}

let recorderStoreSingleton: RecorderStore | null = null;

export function createRecorderStore(): RecorderStore {
  if (recorderStoreSingleton == null) {
    recorderStoreSingleton = createRecorderStoreInstance();
  }

  return recorderStoreSingleton;
}
