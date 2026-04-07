import { beforeEach, describe, expect, it } from "vitest";

import {
  formatHookChangedHistoryForLLM,
  logHookChangedHistoryForLLM,
} from "../logging/hookChangedHistoryLogger";
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
        0: [
          {
            hookIndex: 0,
            prev: 1,
            next: 2,
            commitIndex: 0,
          },
        ],
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
          0: [
            {
              hookIndex: 0,
              prev: 1,
              next: 2,
              commitIndex: 0,
            },
            {
              hookIndex: 0,
              prev: 2,
              next: 3,
              commitIndex: 1,
            },
          ],
          1: [
            {
              hookIndex: 1,
              prev: "a",
              next: "b",
              commitIndex: 1,
            },
          ],
        },
        OtherComponent: {
          0: [
            {
              hookIndex: 0,
              prev: "x",
              next: "y",
              commitIndex: 1,
            },
          ],
        },
      },
    });
    expect(store.getSnapshot().commits).toHaveLength(2);
    expect(store.getSnapshot().fiberChanges).toHaveLength(2);
  });

  it("formats hookChangedHistory into an LLM-friendly log", () => {
    const message = formatHookChangedHistoryForLLM({
      OtherComponent: {
        0: [
          {
            hookIndex: 0,
            prev: { value: "x" },
            next: undefined,
            commitIndex: 1,
          },
        ],
      },
      ExampleComponent: {
        1: [
          {
            hookIndex: 1,
            prev: "a",
            next: "b",
            commitIndex: 2,
          },
        ],
        0: [
          {
            hookIndex: 0,
            prev: 1,
            next: 2,
            commitIndex: 0,
          },
          {
            hookIndex: 0,
            prev: 2,
            next: 3,
            commitIndex: 1,
          },
        ],
      },
    });

    expect(message).toBe(`Hook change history summary
- Components with hook changes: 2
- Distinct changed hooks: 3
- Total hook change events: 4
- Commit indices are zero-based.

Component ExampleComponent
- Hook 0 changed 2 time(s) across commit(s): 0, 1
  - Commit 0: 1 -> 2
  - Commit 1: 2 -> 3
- Hook 1 changed 1 time(s) across commit(s): 2
  - Commit 2: "a" -> "b"

Component OtherComponent
- Hook 0 changed 1 time(s) across commit(s): 1
  - Commit 1: {"value":"x"} -> undefined`);
  });

  it("formats html element hook changes with concise identifiers", () => {
    const message = formatHookChangedHistoryForLLM({
      ExampleComponent: {
        0: [
          {
            hookIndex: 0,
            prev: {
              nodeType: 1,
              tagName: "BUTTON",
              id: "save-button",
              className: "btn primary large extra",
            },
            next: {
              nodeType: 1,
              tagName: "BUTTON",
              id: "cancel-button",
              className: "btn secondary",
            },
            commitIndex: 0,
          },
        ],
      },
    });

    expect(message).toContain(
      "Commit 0: [HTMLElement button#save-button.btn.primary.large] -> [HTMLElement button#cancel-button.btn.secondary]",
    );
    expect(message).not.toContain('"nodeType":1');
    expect(message).not.toContain('"tagName":"BUTTON"');
  });

  it("logs the formatted hookChangedHistory and returns the message", () => {
    const messages: string[] = [];

    const message = logHookChangedHistoryForLLM(
      {
        ExampleComponent: {
          0: [
            {
              hookIndex: 0,
              prev: 1,
              next: 2,
              commitIndex: 0,
            },
          ],
        },
      },
      (formattedMessage) => {
        messages.push(formattedMessage);
      },
    );

    expect(messages).toEqual([message]);
    expect(message).toContain("Component ExampleComponent");
  });
});
