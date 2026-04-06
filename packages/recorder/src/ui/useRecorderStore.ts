import { useSyncExternalStore } from "preact/compat";

import { createRecorderStore, type RecorderStore, type RecorderStoreState } from "../store";

type UseRecorderStoreResult = {
  recorderStore: RecorderStore;
  state: RecorderStoreState;
};

export function useRecorderStore(): UseRecorderStoreResult {
  const recorderStore = createRecorderStore();
  const state = useSyncExternalStore<RecorderStoreState>(
    recorderStore.subscribe,
    recorderStore.getSnapshot,
  );

  return {
    recorderStore,
    state,
  };
}
