import { onCommitFiber } from "@react-record/devtools-api";

import { isInsideInputDispatch } from "./is-inside-input-dispatch";
import { onReactCommit } from "./on-react-commit";
import { exposeRecorderApi } from "./recorder-api";
import { renderRecorderUI } from "./render-recorder-ui";
import { createRecorderStore } from "../store";
import type { RecorderStore } from "../store";

export function installReactRenderRecorder(): void {
  const recorderStore = createRecorderStore();
  const paintBoundaries = createPaintBoundaryTracker(recorderStore);

  exposeRecorderApi(recorderStore);
  renderRecorderUI();
  trackReactCommits(recorderStore, paintBoundaries);
}

function trackReactCommits(
  recorderStore: RecorderStore,
  paintBoundaries: PaintBoundaryTracker,
): void {
  onReactCommit((hook, rendererID, root, _priorityLevel) => {
    recorderStore.setFiberRoot(root);
    if (!recorderStore.getSnapshot().isRecording) {
      return;
    }

    if (root.current?.child == null) {
      return;
    }

    onCommitFiber(root, hook?.renderers.get(rendererID)?.currentDispatcherRef);
    recorderStore.recordCommit();
    paintBoundaries.onCommitRecorded();
  });
}

type PaintBoundaryTracker = {
  onCommitRecorded: () => void;
};

function createPaintBoundaryTracker(recorderStore: RecorderStore): PaintBoundaryTracker {
  runFrameMarkerWhileRecording(recorderStore);

  let taskEndBoundaryScheduled = false;
  return {
    onCommitRecorded() {
      if (isInsideInputDispatch()) {
        return;
      }
      if (taskEndBoundaryScheduled) {
        return;
      }
      taskEndBoundaryScheduled = true;
      queueMicrotask(() => {
        taskEndBoundaryScheduled = false;
        recorderStore.recordPaint();
      });
    },
  };
}

function runFrameMarkerWhileRecording(recorderStore: RecorderStore): void {
  if (typeof requestAnimationFrame === "undefined") {
    return;
  }

  let markerFrameId: number | null = null;
  const marker = () => {
    recorderStore.recordPaint();
    markerFrameId = requestAnimationFrame(marker);
  };

  recorderStore.subscribe(() => {
    const { isRecording } = recorderStore.getSnapshot();
    if (isRecording && markerFrameId == null) {
      markerFrameId = requestAnimationFrame(marker);
    } else if (!isRecording && markerFrameId != null) {
      cancelAnimationFrame(markerFrameId);
      markerFrameId = null;
    }
  });
}
