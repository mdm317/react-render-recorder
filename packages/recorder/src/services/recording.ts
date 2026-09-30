import {
  endRecording as endDevtoolsRecording,
  startRecording as startDevtoolsRecording,
} from "@react-record/devtools-api";

import { inspectSymbolicateSource } from "../lib/inspect-symbolicate-source";
import type { RecorderStore } from "../store";

export function startRecording(store: RecorderStore): void {
  const { fiberRoots, isRecording } = store.getSnapshot();
  if (isRecording || fiberRoots.length === 0) {
    return;
  }
  startDevtoolsRecording(fiberRoots);
  store.startRecording();
}

export function endRecording(store: RecorderStore) {
  if (!store.getSnapshot().isRecording) {
    return null;
  }
  const res = endDevtoolsRecording();
  void inspectSymbolicateSource(res).catch((error: unknown) => {
    console.error("symbolicateSource inspection failed:", error);
  });
  store.endRecording(res);
  return res;
}
