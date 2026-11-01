import type { CommittedFiberChange } from "@react-record/devtools-api";
import { describe, expect, it } from "vitest";

import {
  resolveHookSources,
  type CommitHistoryFiberChange,
} from "@/features/commit-history/resolve-hook-sources";

import { buildCommitHistoryLines, type HistoryLine } from "./build-commit-history-lines";

function makeChange(
  displayName: string | null,
  hooks: CommittedFiberChange["hooks"],
  selfDuration = 0,
  overrides: Partial<CommittedFiberChange> = {},
): CommitHistoryFiberChange {
  const change: CommittedFiberChange = {
    actualDuration: null,
    context: null,
    didHooksChange: hooks != null && hooks.length > 0,
    displayName,
    fiber: {} as never,
    hooks,
    isFirstMount: false,
    prevFiber: null,
    props: null,
    selfDuration,
    state: null,
    ...overrides,
  };
  return resolveHookSources([[change]])[0][0];
}

const STATE_HOOK: NonNullable<CommittedFiberChange["hooks"]> = [
  { hookIndex: 0, hookName: "State", hookPath: ["State"], prev: 0, next: 1 },
];

function componentNames(lines: HistoryLine[]): (string | null)[] {
  return lines.flatMap((line) => (line.kind === "component" ? [line.displayName] : []));
}

function hookChangedNames(lines: HistoryLine[]): (string | null)[] {
  return lines.flatMap((line) =>
    line.kind === "component" && line.hookChanged ? [line.displayName] : [],
  );
}

const TOP_LEVEL_NESTING = { underHooksReason: false, inPathGroup: false };

function renderReasons(lines: HistoryLine[]): string[] {
  return lines.flatMap((line) => (line.kind === "render-reason" ? [line.reason.kind] : []));
}

describe("buildCommitHistoryLines", () => {
  it("emits every component, flagging those with at least one hook change", () => {
    const historyLines = buildCommitHistoryLines([
      [
        makeChange("Kept", STATE_HOOK),
        makeChange("EmptyHooks", []),
        makeChange("NullHooks", null),
        makeChange(null, STATE_HOOK),
      ],
    ]);

    expect(componentNames(historyLines.lines)).toEqual(["Kept", "EmptyHooks", "NullHooks", null]);
    expect(hookChangedNames(historyLines.lines)).toEqual(["Kept", null]);
  });

  it("counts every rendered component", () => {
    const historyLines = buildCommitHistoryLines([
      [makeChange("A", STATE_HOOK), makeChange("EmptyHooks", [])],
      [makeChange(null, STATE_HOOK), makeChange("NullHooks", null)],
      [makeChange("B", STATE_HOOK)],
    ]);

    expect(historyLines.summary).toMatchObject({
      commitCount: 3,
      renderedComponentCount: 5,
    });
  });

  it("sorts components by descending selfDuration", () => {
    const historyLines = buildCommitHistoryLines([
      [
        makeChange("Fast", STATE_HOOK, 0.1),
        makeChange("Slow", STATE_HOOK, 2),
        makeChange("Medium", STATE_HOOK, 0.5),
      ],
    ]);

    expect(componentNames(historyLines.lines)).toEqual(["Slow", "Medium", "Fast"]);
  });

  it("sums selfDuration over every fiber, including unselected ones", () => {
    const historyLines = buildCommitHistoryLines([
      [makeChange("A", STATE_HOOK, 1), makeChange("NullHooks", null, 0.5)],
      [makeChange("B", STATE_HOOK, 2)],
    ]);

    expect(historyLines.summary.totalDurationMs).toBe(3.5);
  });

  it("returns a null total duration for empty input", () => {
    expect(buildCommitHistoryLines([])).toEqual({
      summary: {
        commitCount: 0,
        renderedComponentCount: 0,
        mountedComponentCount: 0,
        totalDurationMs: null,
      },
      lines: [],
    });
  });

  it("emits a no-hook-changes line for commits without hook-changed components", () => {
    const historyLines = buildCommitHistoryLines([[makeChange("NullHooks", null)]]);

    expect(historyLines.lines.slice(0, 2)).toEqual([
      { kind: "commit", commitNumber: 1 },
      { kind: "no-hook-changes" },
    ]);
    expect(componentNames(historyLines.lines)).toEqual(["NullHooks"]);
  });

  it("numbers commits from 1", () => {
    const historyLines = buildCommitHistoryLines([
      [makeChange("A", STATE_HOOK)],
      [makeChange("B", STATE_HOOK)],
    ]);

    const commitNumbers = historyLines.lines.flatMap((line) =>
      line.kind === "commit" ? [line.commitNumber] : [],
    );
    expect(commitNumbers).toEqual([1, 2]);
  });

  it("emits component, hook, field and source lines", () => {
    const historyLines = buildCommitHistoryLines([
      [
        makeChange(
          "Foo",
          [{ hookIndex: 0, hookName: "State", prev: { x: 0, y: 0 }, next: { x: 1, y: 0 } }],
          0.5,
        ),
      ],
    ]);

    expect(historyLines.lines).toEqual([
      { kind: "commit", commitNumber: 1 },
      {
        kind: "component",
        displayName: "Foo",
        hookChanged: true,
        selfDuration: 0.5,
      },
      {
        kind: "hook",
        hookIndex: 0,
        hookName: "State",
        ancestorPath: [],
        changeSummary: { kind: "changed-fields" },
        nesting: TOP_LEVEL_NESTING,
      },
      { kind: "field", path: "x", prev: 0, next: 1, nesting: TOP_LEVEL_NESTING },
      { kind: "source", source: { status: "unavailable" }, nesting: TOP_LEVEL_NESTING },
    ]);
  });

  it.each([
    ["equal objects", { a: 1 }, { a: 1 }, { kind: "equal" }],
    ["primitives", 0, 1, { kind: "replaced", prev: 0, next: 1 }],
    ["null → object", null, { a: 1 }, { kind: "replaced", prev: null, next: { a: 1 } }],
  ])("builds the change summary for %s", (_label, prev, next, expected) => {
    const historyLines = buildCommitHistoryLines([
      [makeChange("Foo", [{ hookIndex: 0, hookName: "State", prev, next }])],
    ]);

    const hookLine = historyLines.lines.find((line) => line.kind === "hook");
    expect(hookLine).toMatchObject({ changeSummary: expected });
  });

  it("splits hookPath into the leaf hook name and its ancestor path", () => {
    const historyLines = buildCommitHistoryLines([
      [
        makeChange("Combo", [
          {
            hookIndex: 0,
            hookName: "SyncExternalStore",
            hookPath: ['Floating("root")', "SyncExternalStore"],
            prev: 0,
            next: 1,
          },
          {
            hookIndex: 1,
            hookName: "State",
            hookPath: ["A", "B", "State"],
            prev: 0,
            next: 1,
          },
          { hookIndex: 2, hookName: "Ref", prev: 0, next: 1 },
        ]),
      ],
    ]);

    const hooks = historyLines.lines.flatMap((line) =>
      line.kind === "hook" ? [{ hookName: line.hookName, ancestorPath: line.ancestorPath }] : [],
    );
    expect(hooks).toEqual([
      { hookName: "SyncExternalStore", ancestorPath: ['Floating("root")'] },
      { hookName: "State", ancestorPath: ["A", "B"] },
      { hookName: "Ref", ancestorPath: [] },
    ]);
  });

  it.each([
    ["no label", ["A", "B", "State"], ["A", "B"]],
    ["a label", ['State("open")', "Store", "StoreR19", "SyncExternalStore"], ['State("open")']],
    [
      "frames above a label",
      ["MenuItem", 'State("open")', "Store", "SyncExternalStore"],
      ["MenuItem", 'State("open")'],
    ],
    ["a non-string label", ["Toggle(true)", "Store", "State"], ["Toggle(true)"]],
    ["an empty label", ['Foo("")', "Store", "State"], ['Foo("")']],
    ["several labels", ['A("x")', "B", 'C("y")', "D", "State"], ['A("x")', "B", 'C("y")']],
  ])("keeps the ancestor path up to the last label with %s", (_label, hookPath, expected) => {
    const historyLines = buildCommitHistoryLines([
      [makeChange("Foo", [{ hookIndex: 0, hookPath, prev: 0, next: 1 }])],
    ]);

    expect(historyLines.lines.find((line) => line.kind === "hook")).toMatchObject({
      ancestorPath: expected,
    });
  });

  it("groups adjacent hooks sharing an ancestor path after shortening", () => {
    const hookOn = (hookIndex: number, hookPath: string[]) => ({
      hookIndex,
      hookPath,
      prev: 0,
      next: 1,
    });
    const historyLines = buildCommitHistoryLines([
      [
        makeChange("Foo", [
          hookOn(0, ["A", "State"]),
          hookOn(1, ['B("x")', "Store", "State"]),
          hookOn(2, ['B("x")', "Effect", "Ref"]),
          hookOn(3, ["A", "State"]),
          hookOn(4, ["State"]),
          hookOn(5, ["Ref"]),
        ]),
      ],
    ]);

    const summaries = historyLines.lines.flatMap((line) => {
      if (line.kind === "hook-path-group") return [["group", ...line.ancestorPath]];
      return line.kind === "hook" ? [[line.hookIndex, ...line.ancestorPath]] : [];
    });
    expect(summaries).toEqual([[0, "A"], ["group", 'B("x")'], [1], [2], [3, "A"], [4], [5]]);
  });

  it.each<[string, Partial<CommittedFiberChange>]>([
    ["context", { context: ["theme"] }],
    ["props", { props: ["a"] }],
    ["state", { state: ["b"] }],
  ])("keeps the hooks reason only beside a %s reason", (_label, overrides) => {
    const reasonKinds = (change: CommitHistoryFiberChange) =>
      renderReasons(buildCommitHistoryLines([[change]]).lines);

    expect(reasonKinds(makeChange("Foo", STATE_HOOK))).toEqual([]);
    expect(reasonKinds(makeChange("Foo", STATE_HOOK, 0, overrides))).toContain("hooks-changed");
  });

  it("orders render reasons context → hooks → props → state, with hook lines under hooks", () => {
    const historyLines = buildCommitHistoryLines([
      [makeChange("Foo", STATE_HOOK, 0, { context: true, props: ["a"], state: ["b"] })],
    ]);

    expect(historyLines.lines.slice(2).map((line) => line.kind)).toEqual([
      "render-reason",
      "render-reason",
      "hook",
      "source",
      "render-reason",
      "render-reason",
    ]);
    expect(renderReasons(historyLines.lines)).toEqual([
      "context-changed",
      "hooks-changed",
      "props-changed",
      "state-changed",
    ]);
  });

  it("emits only parent-rendered when nothing else changed", () => {
    const historyLines = buildCommitHistoryLines([
      [makeChange("Foo", null, 0, { props: [], context: false })],
    ]);

    expect(renderReasons(historyLines.lines)).toEqual(["parent-rendered"]);
  });

  it("merges mounted components into one line grouped by name, slowest total first", () => {
    const mount = (displayName: string | null, selfDuration: number) =>
      makeChange(displayName, null, selfDuration, { isFirstMount: true });
    const historyLines = buildCommitHistoryLines([
      [mount("Item", 0.5), makeChange("Kept", STATE_HOOK, 5), mount("Slow", 1), mount("Item", 2)],
      [makeChange("Kept", STATE_HOOK)],
    ]);

    expect(historyLines.lines.filter((line) => line.kind === "mounted")).toEqual([
      {
        kind: "mounted",
        instanceCount: 3,
        components: [
          { displayName: "Item", count: 2, selfDuration: 2.5 },
          { displayName: "Slow", count: 1, selfDuration: 1 },
        ],
      },
    ]);
    expect(componentNames(historyLines.lines)).toEqual(["Kept", "Kept"]);
    expect(historyLines.summary).toMatchObject({
      renderedComponentCount: 5,
      mountedComponentCount: 3,
    });
  });

  it("marks a hooks reason without resolved hook lines", () => {
    const historyLines = buildCommitHistoryLines([
      [makeChange("Foo", [], 0, { didHooksChange: true })],
    ]);

    expect(historyLines.lines).toContainEqual({
      kind: "render-reason",
      reason: { kind: "hooks-changed", hookCount: 0 },
    });
  });
});
