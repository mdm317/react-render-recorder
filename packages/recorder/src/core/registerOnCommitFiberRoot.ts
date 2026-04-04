import { installHook, type DevToolsHook, type RendererID } from "devtools-api";

import { mountRecorderUI, type RecorderUIOptions } from "../ui/mountRecorderUI";

export type CommitFiberRootCallback = (
  rendererID: RendererID,
  root: unknown,
  priorityLevel?: number,
) => void;

export type InstallReactRecordCommitLoggerOptions = {
  mountTarget?: Element | null;
  recorderUI?: RecorderUIOptions;
};

function resolveMountTarget(
  target: object,
  mountTarget?: Element | null,
): { element: Element | null; cleanup: () => void } {
  if (mountTarget != null) {
    return {
      element: mountTarget,
      cleanup: () => {},
    };
  }

  const targetDocument =
    "document" in target &&
    target.document != null &&
    typeof target.document === "object" &&
    "body" in target.document
      ? (target.document as Document)
      : null;

  if (targetDocument?.body == null) {
    return {
      element: null,
      cleanup: () => {},
    };
  }

  targetDocument.body.insertAdjacentHTML("beforeend", '<div id="recorder-root"></div>');
  const element = targetDocument.body.lastElementChild;

  if (!(element instanceof HTMLDivElement) || element.id !== "recorder-root") {
    return {
      element: null,
      cleanup: () => {},
    };
  }

  return {
    element,
    cleanup: () => {
      element.remove();
    },
  };
}

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
  options: InstallReactRecordCommitLoggerOptions = {},
): () => void {
  const { element: mountTarget, cleanup: cleanupMountTarget } = resolveMountTarget(
    target,
    options.mountTarget,
  );

  const cleanupRecorderUI =
    mountTarget == null ? () => {} : mountRecorderUI(mountTarget, options.recorderUI);

  const cleanupCommitLogger = registerOnCommitFiberRoot((rendererID, root, priorityLevel) => {
    console.log("[react-record] onCommitFiberRoot", { rendererID, root, priorityLevel });
  }, target);

  return () => {
    cleanupCommitLogger();
    cleanupRecorderUI();
    cleanupMountTarget();
  };
}
