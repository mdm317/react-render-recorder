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

function componentNames(lines: HistoryLine[]): string[] {
  return lines.flatMap((line) => (line.kind === "component" ? [line.displayName] : []));
}

function hookChangedNames(lines: HistoryLine[]): string[] {
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

    expect(componentNames(historyLines.lines)).toEqual([
      "Kept",
      "EmptyHooks",
      "NullHooks",
      "Anonymous",
    ]);
    expect(hookChangedNames(historyLines.lines)).toEqual(["Kept", "Anonymous"]);
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

    expect(historyLines.summary.totalDurationText).toBe("3.50ms");
  });

  it("returns a placeholder total duration for empty input", () => {
    expect(buildCommitHistoryLines([])).toEqual({
      summary: {
        commitCount: 0,
        renderedComponentCount: 0,
        totalDurationText: "—",
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

  it("emits component, hook, field and source lines gated by their options", () => {
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
        durationText: { option: "includeRenderDuration", value: "0.50ms" },
      },
      { kind: "render-reason", reason: { kind: "hooks-changed", hookCount: 1 } },
      {
        kind: "hook",
        hookIndex: 0,
        hookName: "State",
        ancestorPathText: null,
        changeSummary: { kind: "changed-fields" },
      },
      { kind: "field", path: "x", prev: "0", next: "1" },
      { kind: "source", sourceText: { option: "includeSource", value: "Unavailable" } },
    ]);
  });

  it.each([
    ["equal objects", { a: 1 }, { a: 1 }, { kind: "equal" }],
    ["primitives", 0, 1, { kind: "replaced", prev: "0", next: "1" }],
    ["null → object", null, { a: 1 }, { kind: "replaced", prev: "null", next: "{a: 1}" }],
  ])("builds the change summary for %s", (_label, prev, next, expected) => {
    const historyLines = buildCommitHistoryLines([
      [makeChange("Foo", [{ hookIndex: 0, hookName: "State", prev, next }])],
    ]);

    const hookLine = historyLines.lines.find((line) => line.kind === "hook");
    expect(hookLine).toMatchObject({ changeSummary: expected });
  });

  it("splits hookPath into the leaf hook name and an ancestor path text", () => {
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
      line.kind === "hook"
        ? [{ hookName: line.hookName, ancestorPathText: line.ancestorPathText }]
        : [],
    );
    expect(hooks).toEqual([
      {
        hookName: "SyncExternalStore",
        ancestorPathText: { option: "includeHookPath", value: 'Floating, debug="root"' },
      },
      { hookName: "State", ancestorPathText: { option: "includeHookPath", value: "A > B" } },
      { hookName: "Ref", ancestorPathText: null },
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
