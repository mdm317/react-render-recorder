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
        totalDurationMs: null,
      },
      lines: [],
    });
  });

  it("emits a no-hook-changes line for commits without hook-changed components", () => {
    const historyLines = buildCommitHistoryLines([[makeChange("NullHooks", null)]]);

    expect(historyLines.lines.slice(0, 2)).toEqual([
      { kind: "commit", commitNumber: 1, mountedComponentCount: 0, rerenderedComponentCount: 1 },
      { kind: "no-hook-changes" },
    ]);
    expect(componentNames(historyLines.lines)).toEqual(["NullHooks"]);
  });

  it("counts first-mounted and re-rendered components per commit separately", () => {
    const historyLines = buildCommitHistoryLines([
      [
        makeChange("A", STATE_HOOK),
        makeChange("B", null, 0, { isFirstMount: true }),
        makeChange("C", null, 0, { isFirstMount: true }),
      ],
    ]);

    expect(historyLines.lines[0]).toEqual({
      kind: "commit",
      commitNumber: 1,
      mountedComponentCount: 2,
      rerenderedComponentCount: 1,
    });
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
      { kind: "commit", commitNumber: 1, mountedComponentCount: 0, rerenderedComponentCount: 1 },
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
        inPathGroup: false,
      },
      { kind: "field", path: "x", prev: 0, next: 1, inPathGroup: false },
      { kind: "source", source: { status: "unavailable" }, inPathGroup: false },
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

  it.each<[string, Partial<CommittedFiberChange>]>([
    ["first-mount", { isFirstMount: true, props: ["a"] }],
    ["parent-rendered", { props: [], context: false }],
  ])("emits only %s when applicable", (expected, overrides) => {
    const historyLines = buildCommitHistoryLines([[makeChange("Foo", null, 0, overrides)]]);

    expect(renderReasons(historyLines.lines)).toEqual([expected]);
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

  describe("hook path cut", () => {
    function ancestorPathOf(hookPath: string[]): string[] {
      const historyLines = buildCommitHistoryLines([
        [makeChange("Foo", [{ hookIndex: 0, hookPath, prev: 0, next: 1 }])],
      ]);
      const hookLine = historyLines.lines.find((line) => line.kind === "hook");
      return hookLine?.kind === "hook" ? hookLine.ancestorPath : [];
    }

    it("drops the frames below a labeled frame", () => {
      expect(
        ancestorPathOf(['State("mounted")', "Store", "StoreFast", "StoreR19", "SyncExternalStore"]),
      ).toEqual(['State("mounted")']);
    });

    it("keeps the frames above the label", () => {
      expect(
        ancestorPathOf(["MenuItem", "CommonProps", 'State("open")', "Store", "State"]),
      ).toEqual(["MenuItem", "CommonProps", 'State("open")']);
    });

    it("cuts at the last label when several frames carry one", () => {
      expect(ancestorPathOf(['A("a")', "B", "Toggle(true)", "C", "State"])).toEqual([
        'A("a")',
        "B",
        "Toggle(true)",
      ]);
    });

    it("leaves a path without a labeled frame unchanged", () => {
      expect(ancestorPathOf(["A", "B", "C", "State"])).toEqual(["A", "B", "C"]);
    });

    it.each([
      ["a multi-line label", 'State("line one\nline two")'],
      ["a label ending in a newline", 'State("line one\n")'],
      ["an object label", "State({a: 1})"],
      ["an empty string label", 'State("")'],
      ["a wrapper name", "ForwardRef(Foo)"],
    ])("treats %s as a labeled frame", (_label, frame) => {
      expect(ancestorPathOf([frame, "Store", "State"])).toEqual([frame]);
    });
  });

  describe("hook path groups", () => {
    const hook = (hookIndex: number, hookPath?: string[]) => ({
      hookIndex,
      hookName: "State",
      hookPath,
      prev: 0,
      next: 1,
    });

    function pathRows(lines: HistoryLine[]): unknown[][] {
      return lines.flatMap<unknown[]>((line) => {
        if (line.kind === "hook-path-group") return [["group", line.ancestorPath]];
        return line.kind === "hook" ? [[line.hookIndex, line.ancestorPath, line.inPathGroup]] : [];
      });
    }

    function pathRowsOf(hooks: NonNullable<CommittedFiberChange["hooks"]>) {
      return pathRows(buildCommitHistoryLines([[makeChange("Foo", hooks)]]).lines);
    }

    it("heads adjacent hooks with one group line, keeping the path on each hook", () => {
      expect(pathRowsOf([hook(0, ["A", "B", "State"]), hook(1, ["A", "B", "State"])])).toEqual([
        ["group", ["A", "B"]],
        [0, ["A", "B"], true],
        [1, ["A", "B"], true],
      ]);
    });

    it("compares paths after the label cut", () => {
      expect(
        pathRowsOf([
          hook(0, ['State("x")', "Store", "State"]),
          hook(1, ['State("x")', "Other", "Deep", "State"]),
        ]),
      ).toEqual([
        ["group", ['State("x")']],
        [0, ['State("x")'], true],
        [1, ['State("x")'], true],
      ]);
    });

    it("does not merge equal paths with another path between them", () => {
      expect(
        pathRowsOf([hook(0, ["A", "State"]), hook(1, ["B", "State"]), hook(2, ["A", "State"])]),
      ).toEqual([
        [0, ["A"], false],
        [1, ["B"], false],
        [2, ["A"], false],
      ]);
    });

    it("starts a new group where the path changes", () => {
      expect(
        pathRowsOf([
          hook(0, ["A", "State"]),
          hook(1, ["A", "State"]),
          hook(2, ["B", "State"]),
          hook(3, ["C", "State"]),
          hook(4, ["C", "State"]),
        ]),
      ).toEqual([
        ["group", ["A"]],
        [0, ["A"], true],
        [1, ["A"], true],
        [2, ["B"], false],
        ["group", ["C"]],
        [3, ["C"], true],
        [4, ["C"], true],
      ]);
    });

    it("compares frame by frame, not the joined text", () => {
      expect(pathRowsOf([hook(0, ["A > B", "State"]), hook(1, ["A", "B", "State"])])).toEqual([
        [0, ["A > B"], false],
        [1, ["A", "B"], false],
      ]);
    });

    it("never groups hooks with an empty path", () => {
      expect(pathRowsOf([hook(0, ["State"]), hook(1), hook(2, ["State"])])).toEqual([
        [0, [], false],
        [1, [], false],
        [2, [], false],
      ]);
    });

    it("does not group across components", () => {
      const historyLines = buildCommitHistoryLines([
        [
          makeChange("Foo", [hook(0, ["A", "State"])], 1),
          makeChange("Bar", [hook(0, ["A", "State"])], 0),
        ],
      ]);

      expect(pathRows(historyLines.lines)).toEqual([
        [0, ["A"], false],
        [0, ["A"], false],
      ]);
    });

    it("marks the field and source lines of grouped hooks", () => {
      const objectHook = { ...hook(1, ["A", "State"]), prev: { x: 0 }, next: { x: 1 } };
      const historyLines = buildCommitHistoryLines([
        [makeChange("Foo", [hook(0, ["A", "State"]), objectHook])],
      ]);

      const rows = historyLines.lines.slice(3);
      expect(rows.map((line) => line.kind)).toEqual([
        "hook-path-group",
        "hook",
        "source",
        "hook",
        "field",
        "source",
      ]);
      expect(rows.slice(1).every((line) => "inPathGroup" in line && line.inPathGroup)).toBe(true);
    });
  });
});
