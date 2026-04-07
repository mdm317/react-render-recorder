import {
  type FiberRoot,
  installHook,
  type CommittedFiberChange,
  type RendererID,
} from "devtools-api";

export type CommitFiberRootCallback = (
  rendererID: RendererID,
  root: FiberRoot,
  priorityLevel?: number,
  changes?: CommittedFiberChange[],
) => void;

function getOrInstallHook(target: object) {
  return (
    (target as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReturnType<typeof installHook> })
      .__REACT_DEVTOOLS_GLOBAL_HOOK__ ?? installHook(target)
  );
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
    const fiberRoot = root as FiberRoot;
    const result = original.call(this, rendererID, root, priorityLevel, ...args);
    callback(rendererID, fiberRoot, priorityLevel);
    return result;
  };

  return () => {
    hook.onCommitFiberRoot = original;
  };
}
