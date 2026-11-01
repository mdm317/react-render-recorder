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
      { kind: "render-reason", reason: { kind: "hooks-changed", hookCount: 1 } },
      {
        kind: "hook",
        hookIndex: 0,
        hookName: "State",
        ancestorPath: [],
        changeSummary: { kind: "changed-fields" },
      },
      { kind: "field", path: "x", prev: 0, next: 1 },
      { kind: "source", source: { status: "unavailable" } },
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

  it("emits only parent-rendered when no other reason applies", () => {
    const historyLines = buildCommitHistoryLines([
      [makeChange("Foo", null, 0, { props: [], context: false })],
    ]);

    expect(renderReasons(historyLines.lines)).toEqual(["parent-rendered"]);
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

  describe("mounted line", () => {
    const mount = (displayName: string | null, selfDuration = 0) =>
      makeChange(displayName, null, selfDuration, { isFirstMount: true });

    function mountedLines(lines: HistoryLine[]): HistoryLine[] {
      return lines.filter((line) => line.kind === "mounted");
    }

    it("groups by exact display name, summing count and selfDuration", () => {
      const historyLines = buildCommitHistoryLines([
        [mount("ForwardRef(Guard)", 0.5), mount("Guard", 1), mount("ForwardRef(Guard)", 0.25)],
      ]);

      expect(mountedLines(historyLines.lines)).toEqual([
        {
          kind: "mounted",
          instanceCount: 3,
          components: [
            { displayName: "Guard", count: 1, selfDuration: 1 },
            { displayName: "ForwardRef(Guard)", count: 2, selfDuration: 0.75 },
          ],
        },
      ]);
    });

    it("sorts groups by summed selfDuration, not by their slowest instance", () => {
      const historyLines = buildCommitHistoryLines([
        [mount("Single", 3), mount("Pair", 2), mount("Pair", 2)],
      ]);

      expect(mountedLines(historyLines.lines)).toMatchObject([
        { components: [{ displayName: "Pair" }, { displayName: "Single" }] },
      ]);
    });

    it("keeps a null display name raw and groups nameless components together", () => {
      const historyLines = buildCommitHistoryLines([[mount(null), mount(null)]]);

      expect(mountedLines(historyLines.lines)).toMatchObject([
        { components: [{ displayName: null, count: 2 }] },
      ]);
    });

    it("sits right below the commit header, before re-rendered components", () => {
      const historyLines = buildCommitHistoryLines([
        [makeChange("Slow", STATE_HOOK, 5), mount("Fast", 1)],
      ]);

      expect(historyLines.lines.slice(0, 3).map((line) => line.kind)).toEqual([
        "commit",
        "mounted",
        "component",
      ]);
      expect(componentNames(historyLines.lines)).toEqual(["Slow"]);
    });

    it("is omitted when nothing mounted in the commit", () => {
      const historyLines = buildCommitHistoryLines([
        [mount("A")],
        [makeChange("B", STATE_HOOK), makeChange("C", null)],
      ]);

      expect(mountedLines(historyLines.lines)).toHaveLength(1);
    });

    it("emits neither a component line nor reasons for a mounted component", () => {
      const historyLines = buildCommitHistoryLines([
        [makeChange("Foo", null, 0, { isFirstMount: true, props: ["a"] })],
      ]);

      expect(componentNames(historyLines.lines)).toEqual([]);
      expect(renderReasons(historyLines.lines)).toEqual([]);
    });

    it("decides no-hook-changes from the full component list", () => {
      const onlyMounts = buildCommitHistoryLines([[mount("A")]]);
      const mountAndHookChange = buildCommitHistoryLines([
        [mount("A"), makeChange("B", STATE_HOOK)],
      ]);

      expect(onlyMounts.lines[1]).toEqual({ kind: "no-hook-changes" });
      expect(mountAndHookChange.lines).not.toContainEqual({ kind: "no-hook-changes" });
    });

    it("counts mounted instances across commits in the summary", () => {
      const historyLines = buildCommitHistoryLines([
        [mount("A"), mount("A"), makeChange("B", STATE_HOOK)],
        [mount("C")],
      ]);

      expect(historyLines.summary).toMatchObject({
        renderedComponentCount: 4,
        mountedComponentCount: 3,
      });
    });
  });
});
