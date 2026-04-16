import { onReactCommit } from "./on-react-commit";
import { onReactPaint } from "./on-react-paint";
import { renderRecorderUI } from "./render-recorder-ui";
import { createRecorderStore } from "../store";
import { onCommitFiber } from "@react-record/devtools-api";

export function installReactRenderRecorder(): () => void {
  const recorderStore = createRecorderStore();

  renderRecorderUI();
  onReactCommit((hook, rendererID, root, priorityLevel) => {
    if (!recorderStore.getSnapshot().isRecording) {
      return;
    }

    const changes = onCommitFiber(root, hook?.renderers.get(rendererID)?.currentDispatcherRef);
    recorderStore.recordCommit({
      changes,
      rendererID,
      root,
      priorityLevel,
    });
  });
  onReactPaint(() => {
    if (!recorderStore.getSnapshot().isRecording) {
      return;
    }

    recorderStore.recordPaint();
  });

  return () => {};
}
