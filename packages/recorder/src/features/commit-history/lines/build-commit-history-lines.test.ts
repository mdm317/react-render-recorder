import type { CommittedFiberChange } from "@react-record/devtools-api";
import { describe, expect, it } from "vitest";

import {
  resolveHookSources,
  type CommitHistoryFiberChange,
} from "@/features/commit-history/resolve-hook-sources";

import {
  buildCommitHistoryLines,
  type HistoryLine,
  type HookChangeSummary,
} from "./build-commit-history-lines";

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
      },
      { kind: "field", path: "x", prev: 0, next: 1 },
      {
        kind: "source",
        source: { status: "unavailable" },
        callerSource: { status: "unavailable" },
      },
    ]);
  });

  describe("caller source", () => {
    const hookSource = {
      fileName: "http://localhost/bundle.js",
      lineNumber: 48,
      columnNumber: 9,
      functionName: "useToggle",
    };
    const hookCallerSource = {
      fileName: "http://localhost/bundle.js",
      lineNumber: 120,
      columnNumber: 20,
      functionName: "Menu",
    };
    const callerKey = `${hookCallerSource.fileName}:120:20`;

    function sourceLine(
      hook: NonNullable<CommittedFiberChange["hooks"]>[number],
      sourceResults: Record<
        string,
        { location: [string, string, number, number]; ignored: boolean } | null
      >,
    ): HistoryLine | undefined {
      const [change] = resolveHookSources([[makeChange("Menu", [hook])]], {
        sourceResults,
        projectRoot: null,
      })[0];
      return buildCommitHistoryLines([[change]]).lines.find((line) => line.kind === "source");
    }

    it("resolves where the parent custom hook was called", () => {
      expect(
        sourceLine(
          { hookIndex: 0, hookName: "State", prev: 0, next: 1, hookSource, hookCallerSource },
          { [callerKey]: { location: ["", "src/Menu.tsx", 88, 20], ignored: false } },
        ),
      ).toMatchObject({
        callerSource: {
          status: "resolved",
          location: { fileName: "src/Menu.tsx", lineNumber: 88, columnNumber: 20 },
        },
      });
    });

    it("resolves to the hook's own location when the component called the hook directly", () => {
      const sourceKey = `${hookSource.fileName}:48:9`;
      expect(
        sourceLine(
          {
            hookIndex: 0,
            hookName: "State",
            prev: 0,
            next: 1,
            hookSource,
            hookCallerSource: hookSource,
          },
          { [sourceKey]: { location: ["", "src/Menu.tsx", 12, 3], ignored: false } },
        ),
      ).toMatchObject({
        source: { status: "resolved", location: { fileName: "src/Menu.tsx", lineNumber: 12 } },
        callerSource: {
          status: "resolved",
          location: { fileName: "src/Menu.tsx", lineNumber: 12 },
        },
      });
    });

    it("is unavailable when the caller frame could not be parsed", () => {
      expect(
        sourceLine(
          {
            hookIndex: 0,
            hookName: "State",
            prev: 0,
            next: 1,
            hookSource,
            hookCallerSource: {
              fileName: null,
              lineNumber: null,
              columnNumber: null,
              functionName: null,
            },
          },
          {},
        ),
      ).toMatchObject({ callerSource: { status: "unavailable" } });
    });

    it("keeps the generated location when the call site is unmapped", () => {
      expect(
        sourceLine(
          { hookIndex: 0, hookName: "State", prev: 0, next: 1, hookSource, hookCallerSource },
          { [callerKey]: null },
        ),
      ).toMatchObject({
        callerSource: {
          status: "unmapped",
          location: { fileName: "/bundle.js", lineNumber: 120, columnNumber: 20 },
        },
      });
    });
  });

  it.each<[string, unknown, unknown, HookChangeSummary]>([
    ["equal objects", { a: 1 }, { a: 1 }, { kind: "references-changed" }],
    ["primitives", 0, 1, { kind: "replaced", prev: 0, next: 1 }],
    ["null → object", null, { a: 1 }, { kind: "replaced", prev: null, next: { a: 1 } }],
    ["function → function", () => 1, () => 2, { kind: "references-changed" }],
    [
      "objects differing only in function fields (still changed-fields)",
      { onClick: () => 1, label: "a" },
      { onClick: () => 1, label: "a" },
      { kind: "changed-fields" },
    ],
    [
      "objects mixing value and function field changes",
      { onClick: () => 1, open: false },
      { onClick: () => 1, open: true },
      { kind: "changed-fields" },
    ],
  ])("builds the change summary for %s", (_label, prev, next, expected) => {
    const historyLines = buildCommitHistoryLines([
      [makeChange("Foo", [{ hookIndex: 0, hookName: "State", prev, next }])],
    ]);

    const hookLine = historyLines.lines.find((line) => line.kind === "hook");
    expect(hookLine).toMatchObject({ changeSummary: expected });
  });

  function buildHookDetailLines(prev: unknown, next: unknown): HistoryLine[] {
    const historyLines = buildCommitHistoryLines([
      [makeChange("Foo", [{ hookIndex: 0, hookName: "State", prev, next }])],
    ]);
    return historyLines.lines.filter(
      (line) => line.kind === "field" || line.kind === "function-references",
    );
  }

  it("gathers function → function paths into one line after the value field lines", () => {
    const added = () => 1;
    const removed = () => 1;
    const lines = buildHookDetailLines(
      { onClick: () => 1, onBlur: () => 1, onFocus: removed, onHover: undefined, open: false },
      { onClick: () => 2, onBlur: () => 2, onFocus: undefined, onHover: added, open: true },
    );

    expect(lines).toEqual([
      { kind: "field", path: "onFocus", prev: removed, next: undefined },
      { kind: "field", path: "onHover", prev: undefined, next: added },
      { kind: "field", path: "open", prev: false, next: true },
      { kind: "function-references", paths: ["onClick", "onBlur"] },
    ]);
  });

  it("keeps nested diff paths in the function-references line", () => {
    const lines = buildHookDetailLines(
      { actions: { increment: () => 1, reset: () => 1 } },
      { actions: { increment: () => 2, reset: () => 2 } },
    );

    expect(lines).toEqual([
      { kind: "function-references", paths: ["actions.increment", "actions.reset"] },
    ]);
    expect(buildHookDetailLines([{ onSelect: () => 1 }], [{ onSelect: () => 2 }])).toEqual([
      { kind: "function-references", paths: ["[0].onSelect"] },
    ]);
  });

  it("emits no function-references line when no function was replaced", () => {
    expect(buildHookDetailLines({ x: 0 }, { x: 1 })).toEqual([
      { kind: "field", path: "x", prev: 0, next: 1 },
    ]);
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
});
