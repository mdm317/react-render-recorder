import { registerOnCommitFiberRoot } from "./registerOnCommitFiberRoot";
import { renderRecorderUI } from "./renderRecorderUI";
import { createRecorderStore } from "../store";
import { onCommitFiber } from "devtools-api";

export function installReactRecordCommitLogger(): () => void {
  const recorderStore = createRecorderStore();

  renderRecorderUI();
  registerOnCommitFiberRoot((hook, rendererID, root,  priorityLevel, ) => {
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
