import { onReactCommit } from "./on-react-commit";
import { onReactPaint } from "./on-react-paint";
import { renderRecorderUI } from "./render-recorder-ui";
import { createRecorderStore } from "../store";
import { onCommitFiber } from "@react-record/devtools-api";

export function installReactRenderRecorder(): () => void {
  const recorderStore = createRecorderStore();

  renderRecorderUI();
  onReactCommit((hook, rendererID, root, _priorityLevel) => {
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

  return () => {};
}
