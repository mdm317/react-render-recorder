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

const TOP_LEVEL = { underHooksReason: false, inPathGroup: false };

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
      {
        kind: "hook",
        hookIndex: 0,
        hookName: "State",
        ancestorPath: [],
        changeSummary: { kind: "changed-fields" },
        nesting: TOP_LEVEL,
      },
      { kind: "field", path: "x", prev: 0, next: 1, nesting: TOP_LEVEL },
      { kind: "source", source: { status: "unavailable" }, nesting: TOP_LEVEL },
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

  it("omits the hooks reason when hook lines are the only reason", () => {
    const hooks = [...STATE_HOOK, { hookIndex: 1, hookName: "State", prev: "a", next: "b" }];
    const historyLines = buildCommitHistoryLines([[makeChange("Foo", hooks)]]);

    expect(renderReasons(historyLines.lines)).toEqual([]);
    expect(historyLines.lines.slice(2).map((line) => line.kind)).toEqual([
      "hook",
      "source",
      "hook",
      "source",
    ]);
  });

  it.each([
    ["context", { context: true }, "context-changed"],
    ["context keys", { context: ["theme"] }, "context-changed"],
    ["props", { props: ["a"] }, "props-changed"],
    ["state", { state: ["b"] }, "state-changed"],
  ] satisfies [string, Partial<CommittedFiberChange>, string][])(
    "keeps the hooks reason and marks hook lines under it beside %s",
    (_, overrides, otherReason) => {
      const historyLines = buildCommitHistoryLines([
        [
          makeChange(
            "Foo",
            [{ hookIndex: 0, hookName: "State", prev: { x: 0 }, next: { x: 1 } }],
            0,
            overrides,
          ),
        ],
      ]);

      expect(renderReasons(historyLines.lines).sort()).toEqual(
        ["hooks-changed", otherReason].sort(),
      );
      expect(historyLines.lines).toContainEqual({
        kind: "render-reason",
        reason: { kind: "hooks-changed", hookCount: 1 },
      });
      const hookRows = historyLines.lines.filter(
        (line) => line.kind === "hook" || line.kind === "field" || line.kind === "source",
      );
      expect(hookRows.map((line) => line.kind)).toEqual(["hook", "field", "source"]);
      expect(hookRows.every((line) => line.nesting.underHooksReason)).toBe(true);
    },
  );

  it("treats empty context, props and state as no other reason", () => {
    const historyLines = buildCommitHistoryLines([
      [makeChange("Foo", STATE_HOOK, 0, { context: [], props: [], state: [] })],
    ]);

    expect(renderReasons(historyLines.lines)).toEqual([]);
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
        ancestorPathOf(["MenuItem", "CommonProps", 'State("open")', "Store", "StoreR19", "State"]),
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
      ["nested parentheses", 'State("fn(a)")'],
      ["an empty string label", 'State("")'],
    ])("recognises %s as a labeled frame", (_label, frame) => {
      expect(ancestorPathOf([frame, "Store", "State"])).toEqual([frame]);
    });

    it("treats a parenthesised wrapper name as a labeled frame", () => {
      expect(ancestorPathOf(["ForwardRef(Foo)", "Store", "State"])).toEqual(["ForwardRef(Foo)"]);
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

    function hookRows(
      hooks: NonNullable<CommittedFiberChange["hooks"]>,
      overrides: Partial<CommittedFiberChange> = {},
    ): HistoryLine[] {
      const historyLines = buildCommitHistoryLines([[makeChange("Foo", hooks, 0, overrides)]]);
      return historyLines.lines.filter(
        (line) => line.kind !== "commit" && line.kind !== "component" && line.kind !== "source",
      );
    }

    function pathFacts(lines: HistoryLine[]) {
      return lines.flatMap((line) =>
        line.kind === "hook" || line.kind === "hook-path-group"
          ? [[line.kind, line.ancestorPath, line.nesting.inPathGroup]]
          : [],
      );
    }

    it("puts the path on a group line and empties it on the adjacent hooks", () => {
      expect(
        pathFacts(hookRows([hook(0, ["A", "B", "State"]), hook(1, ["A", "B", "State"])])),
      ).toEqual([
        ["hook-path-group", ["A", "B"], false],
        ["hook", [], true],
        ["hook", [], true],
      ]);
    });

    it("compares paths after the label cut", () => {
      expect(
        pathFacts(
          hookRows([
            hook(0, ['State("x")', "Store", "State"]),
            hook(1, ['State("x")', "Other", "Deep", "State"]),
          ]),
        ),
      ).toEqual([
        ["hook-path-group", ['State("x")'], false],
        ["hook", [], true],
        ["hook", [], true],
      ]);
    });

    it("keeps hooks with the same path apart when another path sits between them", () => {
      expect(
        pathFacts(
          hookRows([hook(0, ["A", "State"]), hook(1, ["B", "State"]), hook(2, ["A", "State"])]),
        ),
      ).toEqual([
        ["hook", ["A"], false],
        ["hook", ["B"], false],
        ["hook", ["A"], false],
      ]);
    });

    it("splits a component into a group and a following lone hook", () => {
      expect(
        pathFacts(
          hookRows([hook(0, ["A", "State"]), hook(1, ["A", "State"]), hook(2, ["B", "State"])]),
        ),
      ).toEqual([
        ["hook-path-group", ["A"], false],
        ["hook", [], true],
        ["hook", [], true],
        ["hook", ["B"], false],
      ]);
    });

    it("does not merge frames that only match once joined", () => {
      expect(
        pathFacts(hookRows([hook(0, ["A > B", "State"]), hook(1, ["A", "B", "State"])])),
      ).toEqual([
        ["hook", ["A > B"], false],
        ["hook", ["A", "B"], false],
      ]);
    });

    it("never groups hooks with an empty path", () => {
      expect(pathFacts(hookRows([hook(0, ["State"]), hook(1), hook(2, ["State"])]))).toEqual([
        ["hook", [], false],
        ["hook", [], false],
        ["hook", [], false],
      ]);
    });

    it("does not group across components", () => {
      const historyLines = buildCommitHistoryLines([
        [
          makeChange("Foo", [hook(0, ["A", "State"])], 1),
          makeChange("Bar", [hook(0, ["A", "State"])], 0),
        ],
      ]);

      expect(pathFacts(historyLines.lines)).toEqual([
        ["hook", ["A"], false],
        ["hook", ["A"], false],
      ]);
    });

    it("carries the nesting onto field and source lines of grouped hooks", () => {
      const objectHook = { ...hook(1, ["A", "State"]), prev: { x: 0 }, next: { x: 1 } };
      const historyLines = buildCommitHistoryLines([
        [makeChange("Foo", [hook(0, ["A", "State"]), objectHook])],
      ]);

      const rows = historyLines.lines.slice(2);
      expect(rows.map((line) => line.kind)).toEqual([
        "hook-path-group",
        "hook",
        "source",
        "hook",
        "field",
        "source",
      ]);
      expect(rows[0]).toMatchObject({ nesting: TOP_LEVEL });
      expect(rows.slice(1).every((line) => "nesting" in line && line.nesting.inPathGroup)).toBe(
        true,
      );
    });

    it("marks the group and its hooks under the hooks reason beside another reason", () => {
      const rows = hookRows([hook(0, ["A", "State"]), hook(1, ["A", "State"])], { props: ["a"] });

      expect(rows[0]).toEqual({
        kind: "render-reason",
        reason: { kind: "hooks-changed", hookCount: 2 },
      });
      expect(rows[1]).toEqual({
        kind: "hook-path-group",
        ancestorPath: ["A"],
        nesting: { underHooksReason: true, inPathGroup: false },
      });
      expect(rows[2]).toMatchObject({ nesting: { underHooksReason: true, inPathGroup: true } });
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
