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

function groupedNames(lines: HistoryLine[]): (string | null)[] {
  return lines.flatMap((line) =>
    line.kind === "render-group" ? line.components.map((member) => member.displayName) : [],
  );
}

function renderGroups(lines: HistoryLine[]) {
  return lines.flatMap((line) => (line.kind === "render-group" ? [line] : []));
}

function renderReasons(lines: HistoryLine[]): string[] {
  return lines.flatMap((line) => (line.kind === "render-reason" ? [line.reason.kind] : []));
}

describe("buildCommitHistoryLines", () => {
  it("emits component lines for hook-changed components and groups the rest", () => {
    const historyLines = buildCommitHistoryLines([
      [
        makeChange("Kept", STATE_HOOK),
        makeChange("EmptyHooks", []),
        makeChange("NullHooks", null),
        makeChange(null, STATE_HOOK),
      ],
    ]);

    expect(componentNames(historyLines.lines)).toEqual(["Kept", null]);
    expect(groupedNames(historyLines.lines)).toEqual(["EmptyHooks", "NullHooks"]);
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
      { kind: "commit", commitNumber: 1 },
      { kind: "no-hook-changes" },
    ]);
    expect(groupedNames(historyLines.lines)).toEqual(["NullHooks"]);
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
      { kind: "component", displayName: "Foo", selfDuration: 0.5 },
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

  it.each<[string, Partial<CommittedFiberChange>]>([
    ["first-mount", { isFirstMount: true, props: ["a"] }],
    ["parent-rendered", { props: [], context: false }],
  ])("groups under only %s when applicable", (expected, overrides) => {
    const historyLines = buildCommitHistoryLines([[makeChange("Foo", null, 0, overrides)]]);

    expect(renderGroups(historyLines.lines).map((group) => group.reasons)).toEqual([
      [{ kind: expected }],
    ]);
  });

  it("does not fall back to parent-rendered for a hook-changed component", () => {
    const historyLines = buildCommitHistoryLines([[makeChange("Foo", STATE_HOOK)]]);

    expect(renderReasons(historyLines.lines)).toEqual(["hooks-changed"]);
  });

  it("groups hook-less components by reasons in first-seen order, counting same names", () => {
    const historyLines = buildCommitHistoryLines([
      [
        makeChange("Guard", null, 2, { props: ["onFocus"] }),
        makeChange("Leaf", null, 1),
        makeChange("Guard", null, 0.5, { props: ["onFocus"] }),
        makeChange("Row", null, 0.25, { props: ["onFocus"] }),
        makeChange("Leaf", null, 0.125),
      ],
    ]);

    expect(renderGroups(historyLines.lines)).toEqual([
      {
        kind: "render-group",
        reasons: [{ kind: "props-changed", keys: ["onFocus"] }],
        components: [
          { displayName: "Guard", count: 2, selfDuration: 2.5 },
          { displayName: "Row", count: 1, selfDuration: 0.25 },
        ],
      },
      {
        kind: "render-group",
        reasons: [{ kind: "parent-rendered" }],
        components: [{ displayName: "Leaf", count: 2, selfDuration: 1.125 }],
      },
    ]);
  });

  it("keys groups by the whole reason combination, including keys", () => {
    const historyLines = buildCommitHistoryLines([
      [
        makeChange("A", null, 0, { context: true, props: ["style"] }),
        makeChange("B", null, 0, { context: true, props: ["style"] }),
        makeChange("C", null, 0, { context: true }),
        makeChange("D", null, 0, { props: ["style"] }),
        makeChange("E", null, 0, { props: ["onClick"] }),
        makeChange("F", null, 0, { context: ["theme"], state: ["count"] }),
      ],
    ]);

    expect(
      renderGroups(historyLines.lines).map((group) => ({
        reasons: group.reasons,
        names: group.components.map((member) => member.displayName),
      })),
    ).toEqual([
      {
        reasons: [
          { kind: "context-changed", keys: null },
          { kind: "props-changed", keys: ["style"] },
        ],
        names: ["A", "B"],
      },
      { reasons: [{ kind: "context-changed", keys: null }], names: ["C"] },
      { reasons: [{ kind: "props-changed", keys: ["style"] }], names: ["D"] },
      { reasons: [{ kind: "props-changed", keys: ["onClick"] }], names: ["E"] },
      {
        reasons: [
          { kind: "context-changed", keys: ["theme"] },
          { kind: "state-changed", keys: ["count"] },
        ],
        names: ["F"],
      },
    ]);
  });

  it("places group lines after the commit's hook-changed blocks, per commit", () => {
    const historyLines = buildCommitHistoryLines([
      [
        makeChange("Leaf", null, 5),
        makeChange("Foo", [{ hookIndex: 0, hookName: "State", prev: 0, next: 1 }], 1),
      ],
      [makeChange("Leaf", null, 1)],
    ]);

    expect(historyLines.lines.map((line) => line.kind)).toEqual([
      "commit",
      "component",
      "render-reason",
      "hook",
      "source",
      "render-group",
      "commit",
      "no-hook-changes",
      "render-group",
    ]);
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
