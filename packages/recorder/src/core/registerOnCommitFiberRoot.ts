import { installHook, type RendererID } from "devtools-api";

export type CommitFiberRootCallback = (
  rendererID: RendererID,
  root: unknown,
  priorityLevel?: number,
) => void;

export function registerOnCommitFiberRoot(
  callback: CommitFiberRootCallback,
  target: object = globalThis,
): () => void {
  const hook = installHook(target);
  if (hook == null) {
    return () => {};
  }

  const original = hook.onCommitFiberRoot;

  hook.onCommitFiberRoot = function (rendererID, root, priorityLevel, ...args) {
    const result = original.call(this, rendererID, root, priorityLevel, ...args);
    callback(rendererID, root, priorityLevel);
    return result;
  };

  return () => {
    hook.onCommitFiberRoot = original;
  };
}
