import type { CommittedFiberChange } from "@react-record/devtools-api";
import { describe, expect, it } from "vitest";

import { getCommitSectionLines } from "./format-commit-section";

function makeChange(
  displayName: string,
  hooks: NonNullable<CommittedFiberChange["hooks"]>,
  selfDuration = 0,
): CommittedFiberChange {
  return {
    actualDuration: null,
    context: null,
    didHooksChange: true,
    displayName,
    fiber: {} as never,
    hooks,
    isFirstMount: false,
    prevFiber: null,
    props: null,
    selfDuration,
    state: null,
  };
}

describe("format-commit-section shallow shape for null↔object", () => {
  it("renders null → object as a one-level-deep shape, not a full dump", () => {
    const next = {
      subscribe: () => {},
      getSnapshot: () => {},
      state: { open: false },
      listeners: {},
      updateTick: 6,
      syncOnly: false,
    };

    const lines = getCommitSectionLines([
      makeChange("NavRoot", [
        { hookIndex: 13, hookName: "State", hookPath: ["State"], prev: null, next },
      ]),
    ]);

    expect(lines).toEqual([
      "- NavRoot:",
      "  - hook[13] State: null → " +
        "{subscribe: [Function], getSnapshot: [Function], state: [object], " +
        "listeners: [object], updateTick: 6, syncOnly: false}",
    ]);
  });

  it("renders undefined → object the same way", () => {
    const lines = getCommitSectionLines([
      makeChange("Foo", [
        {
          hookIndex: 0,
          hookName: "State",
          hookPath: ["State"],
          prev: undefined,
          next: { a: 1, b: "two" },
        },
      ]),
    ]);

    expect(lines).toEqual(["- Foo:", '  - hook[0] State: undefined → {a: 1, b: "two"}']);
  });

  it("renders object → null using the shallow shape on the prev side", () => {
    const lines = getCommitSectionLines([
      makeChange("Foo", [
        {
          hookIndex: 0,
          hookName: "State",
          hookPath: ["State"],
          prev: { a: 1, nested: { x: 1 }, items: [1, 2, 3] },
          next: null,
        },
      ]),
    ]);

    expect(lines).toEqual([
      "- Foo:",
      "  - hook[0] State: {a: 1, nested: [object], items: [Array(3)]} → null",
    ]);
  });

  it("renders null → array with item summaries", () => {
    const lines = getCommitSectionLines([
      makeChange("Foo", [
        {
          hookIndex: 0,
          hookName: "State",
          hookPath: ["State"],
          prev: null,
          next: [1, "x", { k: 1 }, [9, 9]],
        },
      ]),
    ]);

    expect(lines).toEqual(["- Foo:", '  - hook[0] State: null → [1, "x", [object], [Array(2)]]']);
  });

  it("leaves primitive → primitive untouched", () => {
    const lines = getCommitSectionLines([
      makeChange("Foo", [
        { hookIndex: 0, hookName: "State", hookPath: ["State"], prev: false, next: true },
      ]),
    ]);

    expect(lines).toEqual(["- Foo:", "  - hook[0] State: false → true"]);
  });

  it("still produces path-diff lines for object → object (no regression)", () => {
    const lines = getCommitSectionLines([
      makeChange("Foo", [
        {
          hookIndex: 0,
          hookName: "State",
          hookPath: ["State"],
          prev: { x: 0, y: 0 },
          next: { x: 1, y: 0 },
        },
      ]),
    ]);

    expect(lines).toEqual(["- Foo:", "  - hook[0] State: changed fields:", "      x: 0 → 1"]);
  });

  it("appends selfDuration to the component header when includeRenderDuration is true", () => {
    const lines = getCommitSectionLines(
      [
        makeChange(
          "Foo",
          [{ hookIndex: 0, hookName: "State", hookPath: ["State"], prev: 0, next: 1 }],
          0.5,
        ),
      ],
      { includeRenderDuration: true, includeHookPath: false },
    );

    expect(lines).toEqual(["- Foo (0.50ms):", "  - hook[0] State: 0 → 1"]);
  });

  it("omits the wrapper chain by default for multi-segment hookPaths", () => {
    const lines = getCommitSectionLines([
      makeChange("Combo", [
        {
          hookIndex: 0,
          hookName: "SyncExternalStore",
          hookPath: ["ComboboxRootContext", "FloatingRootContext", "SyncExternalStore"],
          prev: 0,
          next: 1,
        },
      ]),
    ]);

    expect(lines).toEqual(["- Combo:", "  - hook[0] SyncExternalStore: 0 → 1"]);
  });

  it("renders the wrapper chain when includeHookPath is true", () => {
    const lines = getCommitSectionLines(
      [
        makeChange("Combo", [
          {
            hookIndex: 0,
            hookName: "SyncExternalStore",
            hookPath: ["ComboboxRootContext", "FloatingRootContext", "SyncExternalStore"],
            prev: 0,
            next: 1,
          },
        ]),
      ],
      { includeRenderDuration: false, includeHookPath: true },
    );

    expect(lines).toEqual([
      "- Combo:",
      "  - hook[0] SyncExternalStore (in ComboboxRootContext > FloatingRootContext): 0 → 1",
    ]);
  });

  it("groups multiple hook changes under a single component header", () => {
    const lines = getCommitSectionLines([
      makeChange("Foo", [
        { hookIndex: 0, hookName: "State", hookPath: ["State"], prev: false, next: true },
        {
          hookIndex: 2,
          hookName: "Reducer",
          hookPath: ["Reducer"],
          prev: { x: 0, y: 0 },
          next: { x: 1, y: 0 },
        },
      ]),
      makeChange("Bar", [
        { hookIndex: 0, hookName: "State", hookPath: ["State"], prev: 1, next: 2 },
      ]),
    ]);

    expect(lines).toEqual([
      "- Foo:",
      "  - hook[0] State: false → true",
      "  - hook[2] Reducer: changed fields:",
      "      x: 0 → 1",
      "- Bar:",
      "  - hook[0] State: 1 → 2",
    ]);
  });
});
