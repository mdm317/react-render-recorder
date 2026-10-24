import { onCommitFiber } from "@react-record/devtools-api";

import { onReactCommit } from "./on-react-commit";
import { onReactPaint } from "./on-react-paint";
import { exposeRecorderApi } from "./recorder-api";
import { renderRecorderUI } from "./render-recorder-ui";
import { readRecordingOption } from "@/lib/query-parameters";
import { startRecording } from "@/services/recording";
import { createRecorderStore } from "@/store/recorder-store";

export function installReactRenderRecorder(): void {
  const recorderStore = createRecorderStore();
  let autoStartPending = readRecordingOption().record;

  exposeRecorderApi(recorderStore);
  renderRecorderUI();
  onReactCommit((hook, rendererID, root, _priorityLevel) => {
    recorderStore.setFiberRoot(root);

    if (root.current?.child == null) {
      return;
    }

    if (autoStartPending) {
      autoStartPending = false;
      startRecording(recorderStore);
    }

    if (!recorderStore.getSnapshot().isRecording) {
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
