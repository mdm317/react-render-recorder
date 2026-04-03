import { installHook, type DevToolsHook, type RendererID } from "devtools-api";

export type CommitFiberRootCallback = (
  rendererID: RendererID,
  root: unknown,
  priorityLevel?: number,
) => void;

function getOrInstallHook(target: object): DevToolsHook | null {
  if (Object.prototype.hasOwnProperty.call(target, "__REACT_DEVTOOLS_GLOBAL_HOOK__")) {
    return (target as Record<string, unknown>)["__REACT_DEVTOOLS_GLOBAL_HOOK__"] as DevToolsHook;
  }

  return installHook(target);
}

export function registerOnCommitFiberRoot(
  callback: CommitFiberRootCallback,
  target: object = globalThis,
): () => void {
  const hook = getOrInstallHook(target);
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

export function installReactRecordCommitLogger(
  target: object = globalThis,
): () => void {
  return registerOnCommitFiberRoot((rendererID, root, priorityLevel) => {
    console.log("[react-record] onCommitFiberRoot", { rendererID, root, priorityLevel });
  }, target);
}
