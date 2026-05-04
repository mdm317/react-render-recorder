import type { CommittedFiberChange, FiberRoot } from "@react-record/devtools-api";

export type RecorderStoreState = {
  fiberRoots: FiberRoot[];
  fiberChanges: CommittedFiberChange[][];
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
      fiberRoots: state.fiberRoots,
      isRecording: true,
    });
  }

  function endRecording(recordedFiberChanges: CommittedFiberChange[][]) {
    if (!state.isRecording) {
      return;
    }

    recordedCommitCount = 0;
    setState({
      ...state,
      fiberChanges: recordedFiberChanges,
      isRecording: false,
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
