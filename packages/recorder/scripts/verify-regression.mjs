import assert from "node:assert/strict";

import { installHook } from "../../devtools-api/dist/index.js";
import {
  createRecorderStore,
  mountRecorderUI,
  registerOnCommitFiberRoot,
} from "../dist/react-record.js";

assert.equal(typeof mountRecorderUI, "function");
assert.equal(typeof createRecorderStore, "function");

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

const recorderStore = createRecorderStore();

recorderStore.recordCommit({ rendererID: 1, root, priorityLevel: 1 });
assert.deepEqual(recorderStore.getSnapshot(), {
  isRecording: false,
  commitCount: 0,
  latestCommit: null,
  recentCommits: [],
});

recorderStore.setRecording(true);
assert.equal(recorderStore.getSnapshot().isRecording, true);

recorderStore.recordCommit({ rendererID: 2, root, priorityLevel: 2 });
const snapshotAfterCommit = recorderStore.getSnapshot();
assert.equal(snapshotAfterCommit.commitCount, 1);
assert.equal(snapshotAfterCommit.latestCommit?.rendererID, 2);
assert.equal(snapshotAfterCommit.latestCommit?.priorityLevel, 2);
assert.equal(snapshotAfterCommit.latestCommit?.root, root);
assert.equal(typeof snapshotAfterCommit.latestCommit?.timestamp, "number");
assert.equal(snapshotAfterCommit.recentCommits.length, 1);
assert.equal(snapshotAfterCommit.recentCommits[0]?.rendererID, 2);

recorderStore.reset();
assert.deepEqual(recorderStore.getSnapshot(), {
  isRecording: true,
  commitCount: 0,
  latestCommit: null,
  recentCommits: [],
});

console.log("Recorder regression checks passed.");
