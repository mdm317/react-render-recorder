import {
  endRecording as endDevtoolsRecording,
  startRecording as startDevtoolsRecording,
} from "@react-record/devtools-api";

import type { RecorderStore } from "./recorder-store";
import {
  collectSourceLocations,
  inspectProjectRoot,
  inspectSymbolicateSource,
} from "@/features/source/inspect-symbolicate-source";

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

  const locations = collectSourceLocations(fiberChanges);

  void inspectSymbolicateSource(locations).then(async (results) => {
    const projectRoot = await inspectProjectRoot(locations, results);
    store.setSourceInfo(fiberChanges, { sourceResults: results, projectRoot });
  });

  return fiberChanges;
}
