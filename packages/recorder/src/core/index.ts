import { registerOnCommitFiberRoot } from "./register-on-commit-fiber-root";
import { renderRecorderUI } from "./render-recorder-ui";
import { createRecorderStore } from "../store";
import { onCommitFiber } from "@react-record/devtools-api";

export function installReactRecordCommitLogger(): () => void {
  const recorderStore = createRecorderStore();

  renderRecorderUI();
  registerOnCommitFiberRoot((hook, rendererID, root, priorityLevel) => {
    const changes = onCommitFiber(root, hook?.renderers.get(rendererID)?.currentDispatcherRef);
    recorderStore.recordCommit({
      changes,
      rendererID,
      root,
      priorityLevel,
    });
  });

  return () => {};
}
