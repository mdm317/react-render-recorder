import { beforeEach, describe, expect, it } from "vitest";

import { createRecorderStore } from "./recorderStore";

function ExampleComponent() {}

const root = {
  current: {
    alternate: null,
    child: null,
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

function createChange({
  displayName = "ExampleComponent",
  hooks = null,
}: {
  displayName?: string | null;
  hooks?: Array<{ hookIndex: number; prev: unknown; next: unknown }> | null;
} = {}) {
  return {
    changeDescription: {
      context: false,
      didHooksChange: hooks != null && hooks.length > 0,
      hooks,
      isFirstMount: false,
      props: [],
      state: null,
    },
    displayName,
    fiber: {
      alternate: null,
      child: null,
      flags: 1,
      memoizedProps: {},
      memoizedState: null,
      ref: null,
      sibling: null,
      tag: 0,
      type: ExampleComponent,
    },
    prevFiber: null,
  };
}

function recordCommit(
  rendererID: number,
  changes: ReturnType<typeof createChange>[],
  priorityLevel = 1,
) {
  createRecorderStore().recordCommit({
    rendererID,
    root,
    priorityLevel,
    changes,
  });
}

describe("recorderStore", () => {
  beforeEach(() => {
    createRecorderStore().reset();
  });

  it("ignores commits while recording is off", () => {
    recordCommit(1, []);

    expect(createRecorderStore().getSnapshot()).toEqual({
      isRecording: false,
      commits: [],
      fiberChanges: [],
      hookChangedHistory: {},
    });
  });

  it("resets previous data when recording starts", () => {
    const store = createRecorderStore();

    store.setRecording(true);
    recordCommit(1, [
      createChange({ hooks: [{ hookIndex: 0, prev: 1, next: 2 }] }),
    ]);
    store.setRecording(false);

    expect(store.getSnapshot().hookChangedHistory).toEqual({
      ExampleComponent: {
        0: {
          hookIndex: 0,
          prev: 1,
          next: 2,
          commitIndex: 0,
        },
      },
    });

    store.setRecording(true);

    expect(store.getSnapshot()).toEqual({
      isRecording: true,
      commits: [],
      fiberChanges: [],
      hookChangedHistory: {},
    });
  });

  it("derives hookChangedHistory only when recording stops", () => {
    const store = createRecorderStore();

    store.setRecording(true);

    recordCommit(2, [
      createChange({ hooks: [{ hookIndex: 0, prev: 1, next: 2 }] }),
      createChange({
        displayName: null,
        hooks: [{ hookIndex: 9, prev: "ignored", next: "ignored" }],
      }),
      createChange(),
    ], 2);

    recordCommit(3, [
      createChange({
        hooks: [
          { hookIndex: 0, prev: 2, next: 3 },
          { hookIndex: 1, prev: "a", next: "b" },
        ],
      }),
      createChange({
        displayName: "OtherComponent",
        hooks: [{ hookIndex: 0, prev: "x", next: "y" }],
      }),
    ], 3);

    expect(store.getSnapshot().hookChangedHistory).toEqual({});

    store.setRecording(false);

    expect(store.getSnapshot()).toMatchObject({
      isRecording: false,
      hookChangedHistory: {
        ExampleComponent: {
          0: {
            hookIndex: 0,
            prev: 2,
            next: 3,
            commitIndex: 1,
          },
          1: {
            hookIndex: 1,
            prev: "a",
            next: "b",
            commitIndex: 1,
          },
        },
        OtherComponent: {
          0: {
            hookIndex: 0,
            prev: "x",
            next: "y",
            commitIndex: 1,
          },
        },
      },
    });
    expect(store.getSnapshot().commits).toHaveLength(2);
    expect(store.getSnapshot().fiberChanges).toHaveLength(2);
  });
});
