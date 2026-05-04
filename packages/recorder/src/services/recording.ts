import {
  endRecording as endDevtoolsRecording,
  startRecording as startDevtoolsRecording,
  type CommittedFiberChange,
} from "@react-record/devtools-api";

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
  store.endRecording(res);
  return res;
}

export type SerializableFiberChange = Omit<CommittedFiberChange, "fiber" | "prevFiber">;

export function getFiberChanges(store: RecorderStore): SerializableFiberChange[][] {
  return store
    .getSnapshot()
    .fiberChanges.map((commitChanges) =>
      commitChanges.map(({ fiber: _fiber, prevFiber: _prevFiber, ...rest }) => rest),
    );
}
