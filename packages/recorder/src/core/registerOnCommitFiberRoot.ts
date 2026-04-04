import { installHook, type RendererID } from "devtools-api";

import { h, render } from "preact";
import { RecorderUI } from "../ui/RecorderUI";
import type { RecorderUIOptions } from "../ui/types";

export type CommitFiberRootCallback = (
  rendererID: RendererID,
  root: unknown,
  priorityLevel?: number,
) => void;

function initRootContainer(): HTMLDivElement {
  const rootContainer = document.createElement("div");
  rootContainer.id = "recorder-root";

  const shadowRoot = rootContainer.attachShadow({ mode: "open" });
  const rootTarget = document.createElement("div");
  shadowRoot.appendChild(rootTarget);
  document.documentElement.appendChild(rootContainer);

  return rootTarget;
}

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

export function installReactRecordCommitLogger(): () => void {
  const target = initRootContainer();
  render(h(RecorderUI, {} as RecorderUIOptions), target);

  registerOnCommitFiberRoot((_rendererID, _root, _priorityLevel) => {
    // recorderStore.recordCommit({ rendererID: _rendererID, root: _root, priorityLevel: _priorityLevel });
  });

  return () => {};
}
