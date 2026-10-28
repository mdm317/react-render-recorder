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
): CommitHistoryFiberChange {
  const change: CommittedFiberChange = {
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
  return resolveHookSources([[change]])[0][0];
}

const STATE_HOOK: NonNullable<CommittedFiberChange["hooks"]> = [
  { hookIndex: 0, hookName: "State", hookPath: ["State"], prev: 0, next: 1 },
];

function componentNames(lines: HistoryLine[]): string[] {
  return lines.flatMap((line) => (line.kind === "component" ? [line.displayName] : []));
}

describe("buildCommitHistoryLines", () => {
  it("selects only named components with at least one hook change", () => {
    const historyLines = buildCommitHistoryLines([
      [
        makeChange("Kept", STATE_HOOK),
        makeChange("EmptyHooks", []),
        makeChange("NullHooks", null),
        makeChange(null, STATE_HOOK),
      ],
    ]);

    expect(componentNames(historyLines.lines)).toEqual(["Kept"]);
  });

  it("counts rerendered components by the same selection as the listed components", () => {
    const historyLines = buildCommitHistoryLines([
      [makeChange("A", STATE_HOOK), makeChange("EmptyHooks", [])],
      [makeChange(null, STATE_HOOK), makeChange("NullHooks", null)],
      [makeChange("B", STATE_HOOK)],
    ]);

    expect(historyLines.summary).toMatchObject({ commitCount: 3, rerenderedComponentCount: 2 });
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
      summary: { commitCount: 0, rerenderedComponentCount: 0, totalDurationText: "—" },
      lines: [],
    });
  });

  it("emits a no-hook-changes line for commits without selected components", () => {
    const historyLines = buildCommitHistoryLines([[makeChange("NullHooks", null)]]);

    expect(historyLines.lines).toEqual([
      { kind: "commit", commitNumber: 1 },
      { kind: "no-hook-changes" },
    ]);
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
        durationText: { option: "includeRenderDuration", value: "0.50ms" },
      },
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
});
