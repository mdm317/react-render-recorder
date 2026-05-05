import { onCommitFiber } from "@react-record/devtools-api";

import { onReactCommit } from "./on-react-commit";
import { onReactPaint } from "./on-react-paint";
import { exposeRecorderApi } from "./recorder-api";
import { renderRecorderUI } from "./render-recorder-ui";
import { createRecorderStore } from "../store";

export function installReactRenderRecorder(): void {
  const recorderStore = createRecorderStore();

  exposeRecorderApi(recorderStore);
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
