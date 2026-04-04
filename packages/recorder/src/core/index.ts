import { registerOnCommitFiberRoot } from "./registerOnCommitFiberRoot";
import { renderRecorderUI } from "./renderRecorderUI";
import { createRecorderStore } from "../store";

export { registerOnCommitFiberRoot } from "./registerOnCommitFiberRoot";
export type { CommitFiberRootCallback } from "./registerOnCommitFiberRoot";
export { renderRecorderUI } from "./renderRecorderUI";
export { createRecorderStore } from "../store";
export type {
  CommitRecord,
  CreateRecorderStoreOptions,
  RecorderStore,
  RecorderStoreSnapshot,
} from "../store";

export function installReactRecordCommitLogger(): () => void {
  const recorderStore = createRecorderStore();

  renderRecorderUI(recorderStore);
  registerOnCommitFiberRoot((rendererID, root, priorityLevel) => {
    recorderStore.recordCommit({ rendererID, root, priorityLevel });
  });

  return () => {
  };
}
