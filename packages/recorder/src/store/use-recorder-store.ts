import { useSyncExternalStore } from "preact/compat";

import { createRecorderStore, type RecorderStore, type RecorderStoreState } from "./recorder-store";

type UseRecorderStoreResult = {
  state: RecorderStoreState;
  store: RecorderStore;
};

export function useRecorderStore(): UseRecorderStoreResult {
  const recorderStore = createRecorderStore();
  const state = useSyncExternalStore<RecorderStoreState>(
    recorderStore.subscribe,
    recorderStore.getSnapshot,
  );

  return {
    state,
    store: recorderStore,
  };
}
