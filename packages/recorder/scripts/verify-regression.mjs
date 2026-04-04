import assert from "node:assert/strict";

import { installHook } from "../../devtools-api/dist/index.js";
import {
  createRecorderSnapshot,
  mountRecorderUI,
  registerOnCommitFiberRoot,
} from "../dist/react-record.js";

assert.equal(typeof mountRecorderUI, "function");

const idleSnapshot = createRecorderSnapshot({
  label: "Recorder preview",
  isRecording: false,
});

assert.equal(idleSnapshot.label, "Recorder preview");
assert.equal(idleSnapshot.state, "idle");
assert.equal(idleSnapshot.badge, "READY");

const recordingSnapshot = createRecorderSnapshot({
  label: "Recorder preview",
  isRecording: true,
});

assert.equal(recordingSnapshot.state, "recording");
assert.equal(recordingSnapshot.badge, "LIVE");

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
