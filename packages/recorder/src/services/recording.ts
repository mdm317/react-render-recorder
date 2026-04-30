import {
  endRecording as endDevtoolsRecording,
  startRecording as startDevtoolsRecording,
} from "@react-record/devtools-api";

import {
  buildCommitTimingSummaries,
  buildPaintTimingSummaries,
  type CommitTimingSummary,
  type PaintTimingSummary,
} from "../lib/build-commit-timings";
import type { RecorderStore } from "../store";

export type RecorderSnapshot = {
  capturedAt: number;
  commitCount: number;
  commits: CommitTimingSummary[];
  isRecording: boolean;
  paintCommitIndices: number[];
  paints: PaintTimingSummary[];
};

export function startRecording(store: RecorderStore): void {
  const { fiberRoots, isRecording } = store.getSnapshot();
  if (isRecording || fiberRoots.length === 0) {
    return;
  }
  startDevtoolsRecording();
  store.startRecording();
}

export function endRecording(store: RecorderStore): RecorderSnapshot | null {
  if (!store.getSnapshot().isRecording) {
    return null;
  }
  store.endRecording(endDevtoolsRecording());
  return getRecorderSnapshot(store);
}

export function getRecorderSnapshot(store: RecorderStore): RecorderSnapshot {
  const state = store.getSnapshot();
  const commits = buildCommitTimingSummaries(state.fiberChanges);
  const paints = buildPaintTimingSummaries({
    commitTimingSummaries: commits,
    paintCommitIndices: state.paintCommitIndices,
  });
  return {
    capturedAt: Date.now(),
    commitCount: state.fiberChanges.length,
    commits,
    isRecording: state.isRecording,
    paintCommitIndices: state.paintCommitIndices,
    paints,
  };
}
