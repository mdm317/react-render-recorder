import { useSyncExternalStore } from "preact/compat";
import { useRef } from "preact/hooks";

import { createRecorderStore, type RecorderStore, type RecorderStoreState } from "../store";
import type { RecorderUIOptions } from "./types";

type UseRecorderStoreOptions = Pick<RecorderUIOptions, "initialRecording" | "store">;

type UseRecorderStoreResult = {
  recorderStore: RecorderStore;
  state: RecorderStoreState;
};

export function useRecorderStore(options: UseRecorderStoreOptions = {}): UseRecorderStoreResult {
  const { initialRecording, store } = options;
  const fallbackStoreRef = useRef<RecorderStore | null>(store ?? null);

  if (store == null && fallbackStoreRef.current == null) {
    fallbackStoreRef.current = createRecorderStore({ initialRecording });
  }

  const resolvedStore = store ?? fallbackStoreRef.current;
  if (resolvedStore == null) {
    throw new Error("Recorder store could not be initialized.");
  }

  const state = useSyncExternalStore<RecorderStoreState>(
    resolvedStore.subscribe,
    resolvedStore.getSnapshot,
  );

  return {
    recorderStore: resolvedStore,
    state,
  };
}
