import { installHook } from "@react-record/devtools-api";
import type { FiberRoot, ReactRenderer, RendererID } from "@react-record/devtools-api";

export type CommitFiberRootCallback = (
  hook: ReturnType<typeof installHook>,
  rendererID: RendererID,
  root: FiberRoot,
  priorityLevel?: number,
) => void;

function getOrInstallHook(target: object) {
  const existingHook = (
    target as {
      __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReturnType<typeof installHook>;
    }
  ).__REACT_DEVTOOLS_GLOBAL_HOOK__;

  return ensureRendererRegistry(existingHook ?? installHook(target, []));
}

function ensureRendererRegistry(hook: ReturnType<typeof installHook>) {
  if (hook == null) {
    return hook;
  }

  const patchedHook = hook as ReturnType<typeof installHook> & {
    __reactRenderRecorderInjectPatched__?: boolean;
  };

  if (!(hook.renderers instanceof Map)) {
    hook.renderers = new Map();
  }

  if (patchedHook.__reactRenderRecorderInjectPatched__ || typeof hook.inject !== "function") {
    return hook;
  }

  const originalInject = hook.inject.bind(hook);
  hook.inject = (renderer: ReactRenderer) => {
    const rendererID = originalInject(renderer);
    hook.renderers.set(rendererID, renderer);
    return rendererID;
  };
  patchedHook.__reactRenderRecorderInjectPatched__ = true;

  return hook;
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
    callback(hook, rendererID, fiberRoot, priorityLevel);
    return result;
  };

  return () => {
    hook.onCommitFiberRoot = original;
  };
}
