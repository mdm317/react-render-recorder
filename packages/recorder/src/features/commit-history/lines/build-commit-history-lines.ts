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
      // ends at the last useDebugValue-labeled frame; empty when the hook has no ancestor hooks
      ancestorPath: string[];
      changeSummary: HookChangeSummary;
      // a hook-path-group line heads this hook and holds its ancestorPath
      inPathGroup: boolean;
    }
  // heads two or more adjacent hooks of one component with the same non-empty ancestorPath
  | { kind: "hook-path-group"; ancestorPath: string[] }
  // follows its component in DevTools' "Why did this render?" order
  | { kind: "render-reason"; reason: RenderReason }
  // follows a hook line whose changeSummary is "changed-fields"
  | { kind: "field"; path: string; prev: unknown; next: unknown; inPathGroup: boolean }
  | { kind: "source"; source: HookSourceResolution; inPathGroup: boolean };

export type HookChangeSummary =
  | { kind: "replaced"; prev: unknown; next: unknown }
  | { kind: "changed-fields" }
  | { kind: "equal" };

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

// A useDebugValue label already identifies the hook, so the frames below the last one are its
// internals: ['State("open")', "Store", "StoreR19"] → ['State("open")']. Only the frame text is
// available, so wrapper names like ForwardRef(Foo) count as labels too
function buildLabelCutPath(ancestorPath: string[]): string[] {
  const lastLabelIndex = ancestorPath.map((frame) => frame.endsWith(")")).lastIndexOf(true);
  return lastLabelIndex === -1 ? ancestorPath : ancestorPath.slice(0, lastLabelIndex + 1);
}

function splitHookPath(hook: CommitHistoryHookChange): {
  hookName: string;
  ancestorPath: string[];
} {
  const hookPath = "hookPath" in hook ? hook.hookPath : null;
  const hookName = "hookName" in hook ? hook.hookName : null;
  if (hookPath == null || hookPath.length === 0)
    return { hookName: hookName ?? "", ancestorPath: [] };
  return {
    hookName: hookPath[hookPath.length - 1],
    ancestorPath: buildLabelCutPath(hookPath.slice(0, -1)),
  };
}

function buildChangeSummary({ prev, next, diffs }: ValueChange): HookChangeSummary {
  if (diffs == null) {
    return { kind: "replaced", prev, next };
  }
  return diffs.length === 0 ? { kind: "equal" } : { kind: "changed-fields" };
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

// the hook line followed by one field line per changed field, then its source line
function buildHookChangedLines(hook: CommitHistoryHookChange, inPathGroup: boolean): HistoryLine[] {
  const { hookName, ancestorPath } = splitHookPath(hook);
  const valueChange = buildValueChange(hook.prev, hook.next);
  const lines: HistoryLine[] = [
    {
      kind: "hook",
      hookIndex: hook.hookIndex,
      hookName,
      ancestorPath,
      changeSummary: buildChangeSummary(valueChange),
      inPathGroup,
    },
  ];
  for (const diff of valueChange.diffs ?? []) lines.push({ kind: "field", ...diff, inPathGroup });
  lines.push({ kind: "source", source: hook.source, inPathGroup });
  return lines;
}

function isSamePath(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((frame, index) => frame === b[index]);
}

// the lines of one component's hooks; only adjacent hooks group, so hook order is preserved
function buildHookListLines(hooks: CommitHistoryHookChange[]): HistoryLine[] {
  const paths = hooks.map((hook) => splitHookPath(hook).ancestorPath);
  const matchesPrevious = paths.map(
    (path, index) => index > 0 && path.length > 0 && isSamePath(paths[index - 1], path),
  );
  return hooks.flatMap((hook, index) => {
    const matchesNext = matchesPrevious[index + 1] === true;
    const hookLines = buildHookChangedLines(hook, matchesPrevious[index] || matchesNext);
    if (matchesPrevious[index] || !matchesNext) return hookLines;
    return [{ kind: "hook-path-group", ancestorPath: paths[index] }, ...hookLines];
  });
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
    lines.push(...buildHookListLines(hooks));
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
