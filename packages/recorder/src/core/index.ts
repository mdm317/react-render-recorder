import { registerOnCommitFiberRoot } from "./registerOnCommitFiberRoot";
import { renderRecorderUI } from "./renderRecorderUI";
import { createRecorderStore } from "../store";
import { onCommitFiber } from "devtools-api";
export { registerOnCommitFiberRoot } from "./registerOnCommitFiberRoot";
export type { CommitFiberRootCallback } from "./registerOnCommitFiberRoot";
export { renderRecorderUI } from "./renderRecorderUI";
export {
  createRecorderStore,
  formatCommitHookChangedHistoryForLLM,
  formatHookChangedHistoryForLLM,
  logCommitHookChangedHistoryForLLM,
  logHookChangedHistoryForLLM,
} from "../store";
export type {
  CreateRecorderStoreOptions,
  HookChangedHistory,
  HookChangedHistoryLogger,
  HookHistoryEntry,
  HookIndexed,
  RecorderStore,
  RecorderStoreState,
} from "../store";

export function installReactRecordCommitLogger(): () => void {
  const recorderStore = createRecorderStore();

  renderRecorderUI();
  registerOnCommitFiberRoot((rendererID, root, priorityLevel) => {
    const changes = onCommitFiber(root);
    recorderStore.recordCommit({
      changes,
      rendererID,
      root,
      priorityLevel,
    });
  });

  return () => {};
}
