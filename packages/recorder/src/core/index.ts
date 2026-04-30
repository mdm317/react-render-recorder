import { onCommitFiber } from "@react-record/devtools-api";

import { onReactCommit } from "./on-react-commit";
import { onReactPaint } from "./on-react-paint";
import { renderRecorderUI } from "./render-recorder-ui";
import {
  endRecording,
  getRecorderSnapshot,
  startRecording,
} from "../services/recording";
import { createRecorderStore } from "../store";

const RECORDER_GLOBAL = "__REACT_RENDER_RECORDER__";

function exposeRecorderControl(
  recorderStore: ReturnType<typeof createRecorderStore>,
): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>)[RECORDER_GLOBAL] = {
    start: () => startRecording(recorderStore),
    end: () => endRecording(recorderStore),
    snapshot: () => getRecorderSnapshot(recorderStore),
  };
}

export function installReactRenderRecorder(): void {
  const recorderStore = createRecorderStore();

  exposeRecorderControl(recorderStore);
  renderRecorderUI();
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
  });
  onReactPaint(() => {
    if (!recorderStore.getSnapshot().isRecording) {
      return;
    }

    recorderStore.recordPaint();
  });
}
