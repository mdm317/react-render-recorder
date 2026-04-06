import assert from "node:assert/strict";

import { installHook, onCommitFiber } from "../../devtools-api/dist/index.js";
import {
  createRecorderStore,
  installReactRecordCommitLogger,
  registerOnCommitFiberRoot,
} from "../dist/react-record.js";

assert.equal(typeof installReactRecordCommitLogger, "function");
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
function ExampleComponent() {}

const previousChild = {
  alternate: null,
  child: null,
  flags: 0,
  memoizedProps: { value: 1 },
  memoizedState: null,
  ref: null,
  sibling: null,
  tag: 0,
  type: ExampleComponent,
};

const currentChild = {
  alternate: previousChild,
  child: null,
  flags: 1,
  memoizedProps: { value: 2 },
  memoizedState: null,
  ref: null,
  sibling: null,
  tag: 0,
  type: ExampleComponent,
};

const root = {
  current: {
    alternate: null,
    child: currentChild,
    flags: 0,
    memoizedState: {
      element: {},
    },
    memoizedProps: null,
    ref: null,
    sibling: null,
    tag: 3,
    type: null,
  },
};

let callbackArgs = null;

const cleanup = registerOnCommitFiberRoot((rendererID, fiberRoot, priorityLevel, changes) => {
  callbackArgs = [rendererID, fiberRoot, priorityLevel, changes];
}, recorderTarget);

const wrappedHook = recorderTarget.__REACT_DEVTOOLS_GLOBAL_HOOK__;
const result = wrappedHook.onCommitFiberRoot(7, root, 3);

assert.equal(result, "original-result");
assert.deepEqual(callLog, [["original", 7, 3, root]]);
assert.deepEqual(callbackArgs, [
  7,
  root,
  3,
  [
    {
      changeDescription: {
        context: false,
        didHooksChange: false,
        hooks: null,
        isFirstMount: false,
        props: ["value"],
        state: null,
      },
      displayName: "ExampleComponent",
      fiber: currentChild,
      prevFiber: previousChild,
    },
  ],
]);

cleanup();

assert.equal(
  recorderTarget.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot,
  existingHook.onCommitFiberRoot,
);

const previousHookChild = {
  alternate: null,
  child: null,
  flags: 0,
  memoizedProps: {},
  memoizedState: {
    memoizedState: 1,
    next: null,
    queue: {
      pending: null,
    },
  },
  ref: null,
  sibling: null,
  tag: 0,
  type: ExampleComponent,
};

const currentHookChild = {
  alternate: previousHookChild,
  child: null,
  flags: 1,
  memoizedProps: {},
  memoizedState: {
    memoizedState: 2,
    next: null,
    queue: {
      pending: null,
    },
  },
  ref: null,
  sibling: null,
  tag: 0,
  type: ExampleComponent,
};

const hookRoot = {
  current: {
    alternate: null,
    child: currentHookChild,
    flags: 0,
    memoizedState: {
      element: {},
    },
    memoizedProps: null,
    ref: null,
    sibling: null,
    tag: 3,
    type: null,
  },
};

assert.deepEqual(onCommitFiber(hookRoot), [
  {
    changeDescription: {
      context: false,
      didHooksChange: true,
      hooks: [
        {
          index: 0,
          prev: 1,
          next: 2,
        },
      ],
      isFirstMount: false,
      props: [],
      state: null,
    },
    displayName: "ExampleComponent",
    fiber: currentHookChild,
    prevFiber: previousHookChild,
  },
]);

const recorderStore = createRecorderStore();
const recorderStoreSingleton = createRecorderStore();

assert.equal(recorderStoreSingleton, recorderStore);
recorderStore.reset();

recorderStore.recordCommit({ rendererID: 1, root, priorityLevel: 1, changes: [] });
assert.deepEqual(recorderStore.getSnapshot(), {
  isRecording: false,
  commits: [],
  fiberChanges: [],
  hookChangedHistory: {},
});

recorderStore.setRecording(true);
assert.equal(recorderStore.getSnapshot().isRecording, true);

recorderStore.recordCommit({ rendererID: 2, root, priorityLevel: 2, changes: [] });
const stateAfterCommit = recorderStore.getSnapshot();
assert.equal(stateAfterCommit.commits.length, 1);
assert.deepEqual(stateAfterCommit.fiberChanges, [[]]);
assert.deepEqual(stateAfterCommit.hookChangedHistory, {});
assert.equal(stateAfterCommit.commits[0]?.rendererID, 2);
assert.equal(stateAfterCommit.commits[0]?.priorityLevel, 2);
assert.equal(stateAfterCommit.commits[0]?.root, root);

recorderStore.reset();
assert.deepEqual(recorderStore.getSnapshot(), {
  isRecording: false,
  commits: [],
  fiberChanges: [],
  hookChangedHistory: {},
});

console.log("Recorder regression checks passed.");
