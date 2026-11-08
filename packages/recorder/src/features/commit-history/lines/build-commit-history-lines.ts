import type {
  CommitHistoryFiberChange,
  CommitHistoryHookChange,
} from "@/features/commit-history/resolve-hook-sources";
import type { HookSourceResolution } from "@/features/source/resolve-hook-source";
import { buildValueChange, type ValueChange } from "./build-value-change";

export type CommitHistoryLines = { summary: HistorySummary; lines: HistoryLine[] };
export type HistorySummary = {
  commitCount: number;
  // every rendered component, not just the hook-changed ones
  renderedComponentCount: number;
  // sums every fiber, not just the hook-changed components; null when no fiber rendered
  totalDurationMs: number | null;
};

// one entry per logical line, holding facts only; the printer decides how each one is shown.
// Components within a commit are sorted by descending selfDuration.
export type HistoryLine =
  | {
      kind: "commit";
      commitNumber: number;
      // disjoint: first mounts vs re-renders of already-mounted components
      mountedComponentCount: number;
      rerenderedComponentCount: number;
    }
  // no component in the commit changed a hook
  | { kind: "no-hook-changes" }
  | {
      kind: "component";
      displayName: string | null;
      // false: the component rendered without a hook change
      hookChanged: boolean;
      selfDuration: number;
    }
  | {
      kind: "hook";
      hookIndex: number;
      hookName: string;
      // empty when the hook has no ancestor hooks
      ancestorPath: string[];
      changeSummary: HookChangeSummary;
    }
  // follows its component in DevTools' "Why did this render?" order
  | { kind: "render-reason"; reason: RenderReason }
  // follows a hook line whose changeSummary is "changed-fields"; may be absent when only
  // function references changed
  | { kind: "field"; path: string; prev: unknown; next: unknown }
  // last line under a "changed-fields" hook: paths whose function value was replaced by another function
  | { kind: "function-references"; paths: string[] }
  // callerSource: the line in the component body that leads to this hook; the same location as source
  // when the component called the hook directly
  | { kind: "source"; source: HookSourceResolution; callerSource: HookSourceResolution };

export type HookChangeSummary =
  | { kind: "replaced"; prev: unknown; next: unknown }
  | { kind: "changed-fields" }
  // no comparable content changed: function → function, or a structurally equal object
  | { kind: "references-changed" };

// mirrors react-devtools-shared Profiler/WhatChanged.js
export type RenderReason =
  | { kind: "first-mount" }
  // keys: null when React only reports that some context changed
  | { kind: "context-changed"; keys: string[] | null }
  // hookCount: the hook lines that follow
  | { kind: "hooks-changed"; hookCount: number }
  | { kind: "props-changed"; keys: string[] }
  | { kind: "state-changed"; keys: string[] }
  | { kind: "parent-rendered" };

function splitHookPath(hook: CommitHistoryHookChange): {
  hookName: string;
  ancestorPath: string[];
} {
  const hookPath = "hookPath" in hook ? hook.hookPath : null;
  const hookName = "hookName" in hook ? hook.hookName : null;
  if (hookPath == null || hookPath.length === 0)
    return { hookName: hookName ?? "", ancestorPath: [] };
  return { hookName: hookPath[hookPath.length - 1], ancestorPath: hookPath.slice(0, -1) };
}

function isFunctionReferenceChange(prev: unknown, next: unknown): boolean {
  return typeof prev === "function" && typeof next === "function";
}

function buildChangeSummary({ prev, next, diffs }: ValueChange): HookChangeSummary {
  if (diffs == null) {
    if (isFunctionReferenceChange(prev, next)) return { kind: "references-changed" };
    return { kind: "replaced", prev, next };
  }
  return diffs.length === 0 ? { kind: "references-changed" } : { kind: "changed-fields" };
}

function buildComponentLine(component: CommitHistoryFiberChange): HistoryLine {
  const { displayName, selfDuration } = component;
  return {
    kind: "component",
    displayName,
    hookChanged: component.didHooksChange,
    selfDuration,
  };
}

// the hook line, one field line per value change, then one line gathering function → function paths
function buildHookChangedLines(hook: CommitHistoryHookChange): HistoryLine[] {
  const { hookName, ancestorPath } = splitHookPath(hook);
  const valueChange = buildValueChange(hook.prev, hook.next);
  const lines: HistoryLine[] = [
    {
      kind: "hook",
      hookIndex: hook.hookIndex,
      hookName,
      ancestorPath,
      changeSummary: buildChangeSummary(valueChange),
    },
  ];
  const functionReferencePaths: string[] = [];
  for (const diff of valueChange.diffs ?? []) {
    if (isFunctionReferenceChange(diff.prev, diff.next)) functionReferencePaths.push(diff.path);
    else lines.push({ kind: "field", ...diff });
  }
  if (functionReferencePaths.length > 0) {
    lines.push({ kind: "function-references", paths: functionReferencePaths });
  }
  return lines;
}

function buildRenderReasonLine(reason: RenderReason): HistoryLine {
  return { kind: "render-reason", reason };
}

// the lines under a component line: render reasons in WhatChanged.js order
// (context → hooks → props → state, falling back to the parent), hook lines under the hooks reason
function buildComponentChangeLines(component: CommitHistoryFiberChange): HistoryLine[] {
  if (component.isFirstMount) return [buildRenderReasonLine({ kind: "first-mount" })];

  const lines: HistoryLine[] = [];
  const { context } = component;
  if (context === true || (Array.isArray(context) && context.length > 0)) {
    const keys = context === true ? null : context;
    lines.push(buildRenderReasonLine({ kind: "context-changed", keys }));
  }
  if (component.didHooksChange) {
    const hooks = component.hooks ?? [];
    lines.push(buildRenderReasonLine({ kind: "hooks-changed", hookCount: hooks.length }));
    for (const hook of hooks) {
      lines.push(...buildHookChangedLines(hook), {
        kind: "source",
        source: hook.source,
        callerSource: hook.callerSource,
      });
    }
  }
  if (component.props != null && component.props.length > 0) {
    lines.push(buildRenderReasonLine({ kind: "props-changed", keys: component.props }));
  }
  if (component.state != null && component.state.length > 0) {
    lines.push(buildRenderReasonLine({ kind: "state-changed", keys: component.state }));
  }
  if (lines.length === 0) lines.push(buildRenderReasonLine({ kind: "parent-rendered" }));
  return lines;
}

function buildHistorySummary(fiberChangesByCommit: CommitHistoryFiberChange[][]): HistorySummary {
  let totalDurationMs: number | null = null;
  let renderedComponentCount = 0;
  for (const fiberChanges of fiberChangesByCommit) {
    renderedComponentCount += fiberChanges.length;
    for (const change of fiberChanges) {
      totalDurationMs = (totalDurationMs ?? 0) + change.selfDuration;
    }
  }
  return {
    commitCount: fiberChangesByCommit.length,
    renderedComponentCount,
    totalDurationMs,
  };
}

// walks commit → component → hook directly; every builder it calls returns finished lines
export function buildCommitHistoryLines(
  fiberChangesByCommit: CommitHistoryFiberChange[][],
): CommitHistoryLines {
  const lines: HistoryLine[] = [];
  for (const [index, fiberChanges] of fiberChangesByCommit.entries()) {
    const mountedComponentCount = fiberChanges.filter((change) => change.isFirstMount).length;
    lines.push({
      kind: "commit",
      commitNumber: index + 1,
      mountedComponentCount,
      rerenderedComponentCount: fiberChanges.length - mountedComponentCount,
    });
    const components = [...fiberChanges].sort((a, b) => b.selfDuration - a.selfDuration);
    if (!components.some((change) => change.didHooksChange)) {
      lines.push({ kind: "no-hook-changes" });
    }

    for (const component of components) {
      lines.push(buildComponentLine(component), ...buildComponentChangeLines(component));
    }
  }
  return { summary: buildHistorySummary(fiberChangesByCommit), lines };
}
