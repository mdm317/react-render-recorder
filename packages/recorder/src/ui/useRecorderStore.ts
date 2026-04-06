import { useSyncExternalStore } from "preact/compat";

import {
  createRecorderStore,
  type RecorderStoreState,
} from "../store";

type UseRecorderStoreResult = {
  setRecording: (value: boolean) => void;
  state: RecorderStoreState;
};

export function useRecorderStore(): UseRecorderStoreResult {
  const recorderStore = createRecorderStore();
  const state = useSyncExternalStore<RecorderStoreState>(
    recorderStore.subscribe,
    recorderStore.getSnapshot,
  );

  return {
    setRecording: recorderStore.setRecording,
    state,
  };
}
