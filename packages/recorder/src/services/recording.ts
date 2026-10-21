import {
  endRecording as endDevtoolsRecording,
  startRecording as startDevtoolsRecording,
} from "@react-record/devtools-api";

import type { RecorderStore } from "../store";
import {
  collectSourceLocations,
  inspectSymbolicateSource,
} from "../lib/inspect-symbolicate-source";

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

  const fiberChanges = endDevtoolsRecording();
  store.endRecording(fiberChanges);

  void inspectSymbolicateSource(collectSourceLocations(fiberChanges)).then((results) => {
    store.setSourceResults(fiberChanges, results);
  });

  return fiberChanges;
}
