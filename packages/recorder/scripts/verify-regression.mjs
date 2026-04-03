import assert from "node:assert/strict";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { installHook } from "../../devtools-api/dist/index.js";
import {
  ReactRecord,
  registerOnCommitFiberRoot,
} from "../dist/react-record.js";

const idleMarkup = renderToStaticMarkup(
  createElement(ReactRecord, { label: "Recorder preview" }),
);

assert.match(idleMarkup, /Recorder is idle\./);
assert.match(idleMarkup, /devtools-api:READY/);

const liveMarkup = renderToStaticMarkup(
  createElement(ReactRecord, {
    label: "Recorder preview",
    initialRecording: true,
  }),
);

assert.match(liveMarkup, /Recording in progress\./);
assert.match(liveMarkup, /devtools-api:LIVE/);

const hookTarget = {};
const hook = installHook(hookTarget);

assert.ok(hook);
assert.equal(hookTarget.__REACT_DEVTOOLS_GLOBAL_HOOK__, hook);
assert.equal(installHook(hookTarget), null);

const callLog = [];
const existingHook = {
  onCommitFiberRoot(rendererID, root, priorityLevel) {
    callLog.push(["original", rendererID, priorityLevel, root]);
    return "original-result";
  },
};

const recorderTarget = {
  __REACT_DEVTOOLS_GLOBAL_HOOK__: existingHook,
};
const root = {
  current: {
    memoizedState: {
      element: {},
    },
  },
};

let callbackArgs = null;

const cleanup = registerOnCommitFiberRoot((rendererID, fiberRoot, priorityLevel) => {
  callbackArgs = [rendererID, fiberRoot, priorityLevel];
}, recorderTarget);

const wrappedHook = recorderTarget.__REACT_DEVTOOLS_GLOBAL_HOOK__;
const result = wrappedHook.onCommitFiberRoot(7, root, 3);

assert.equal(result, "original-result");
assert.deepEqual(callLog, [["original", 7, 3, root]]);
assert.deepEqual(callbackArgs, [7, root, 3]);

cleanup();

assert.equal(recorderTarget.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot, existingHook.onCommitFiberRoot);

console.log("Recorder regression checks passed.");
