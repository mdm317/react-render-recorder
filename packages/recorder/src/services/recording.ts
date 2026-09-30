import {
  endRecording as endDevtoolsRecording,
  startRecording as startDevtoolsRecording,
} from "@react-record/devtools-api";

import type { RecorderStore } from "../store";
import { inspectSymbolicateSource } from "../lib/inspect-symbolicate-source";

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
  store.endRecording(res);
  void inspectSymbolicateSource(res).then((results) => {
    store.setSourceResults(res, results);
  });
  return res;
}
