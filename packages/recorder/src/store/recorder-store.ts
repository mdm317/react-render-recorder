import type { CommittedFiberChange, FiberRoot } from "@react-record/devtools-api";

import {
  buildHookChangedHistory,
  type HookChangedHistory,
} from "../lib/build-hook-changed-history";

export type RecorderStoreState = {
  fiberRoots: FiberRoot[];
  fiberChanges: CommittedFiberChange[][];
  hookChangedHistory: HookChangedHistory;
  isRecording: boolean;
  paintCommitIndices: number[];
};

export type RecorderStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => RecorderStoreState;
  recordCommit: () => void;
  recordPaint: () => void;
  startRecording: () => void;
  endRecording: (recordedFiberChanges: CommittedFiberChange[][]) => void;
  reset: () => void;
  setFiberRoot: (fiberRoot: FiberRoot) => void;
};

function createInitialState(): RecorderStoreState {
  return {
    fiberRoots: [],
    fiberChanges: [],
    hookChangedHistory: {},
    isRecording: false,
    paintCommitIndices: [],
  };
}

function createRecorderStoreInstance(): RecorderStore {
  const listeners = new Set<() => void>();
  let state: RecorderStoreState = createInitialState();
  let recordedCommitCount = 0;

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
    if (state.isRecording) {
      return;
    }
    recordedCommitCount = 0;
    setState({
      ...createInitialState(),
      isRecording: true,
    });
  }

  function endRecording(recordedFiberChanges: CommittedFiberChange[][]) {
    if (!state.isRecording) {
      return;
    }
    const fiberChangesWithoutBailout: CommittedFiberChange[][] = [];
    const nextPaintCommitIndices: number[] = [];
    const paintCommitIndexSet = new Set(state.paintCommitIndices);

    for (const [commitIndex, commitChanges] of recordedFiberChanges.entries()) {
      if (commitChanges.length === 0) {
        continue;
      }

      if (paintCommitIndexSet.has(commitIndex)) {
        nextPaintCommitIndices.push(fiberChangesWithoutBailout.length);
      }

      fiberChangesWithoutBailout.push(commitChanges);
    }

    recordedCommitCount = 0;
    setState({
      ...state,
      fiberChanges: fiberChangesWithoutBailout,
      hookChangedHistory: buildHookChangedHistory(fiberChangesWithoutBailout),
      isRecording: false,
      paintCommitIndices: nextPaintCommitIndices,
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

    recordCommit() {
      if (!state.isRecording) {
        return;
      }

      recordedCommitCount += 1;
    },

    recordPaint() {
      if (!state.isRecording || recordedCommitCount === 0) {
        return;
      }

      const paintCommitIndex = recordedCommitCount - 1;
      if (state.paintCommitIndices[state.paintCommitIndices.length - 1] === paintCommitIndex) {
        return;
      }

      state.paintCommitIndices.push(paintCommitIndex);
    },

    startRecording,

    endRecording,
    setFiberRoot(fiberRoot) {
      if (state.fiberRoots.includes(fiberRoot)) {
        return;
      }

      setState({
        ...state,
        fiberRoots: [...state.fiberRoots, fiberRoot],
      });
    },
    reset() {
      recordedCommitCount = 0;
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
