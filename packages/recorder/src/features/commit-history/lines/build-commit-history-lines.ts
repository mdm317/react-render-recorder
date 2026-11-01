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
  mountedComponentCount: number;
  // sums every fiber, not just the hook-changed components; null when no fiber rendered
  totalDurationMs: number | null;
};

// one entry per logical line, holding facts only; the printer decides how each one is shown.
// Within a commit the mounted line comes first, then components by descending selfDuration.
export type HistoryLine =
  | { kind: "commit"; commitNumber: number }
  // no component in the commit changed a hook
  | { kind: "no-hook-changes" }
  // the components rendering for the first time in the commit; instanceCount sums the group counts
  | { kind: "mounted"; instanceCount: number; components: MountedGroup[] }
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
      // true: the hooks-changed reason line heads this hook
      underHooksReason: boolean;
    }
  // follows its component in DevTools' "Why did this render?" order
  | { kind: "render-reason"; reason: RenderReason }
  // follows a hook line whose changeSummary is "changed-fields"
  | { kind: "field"; path: string; prev: unknown; next: unknown; underHooksReason: boolean }
  | { kind: "source"; source: HookSourceResolution; underHooksReason: boolean };

export type MountedGroup = { displayName: string | null; count: number; selfDuration: number };

export type HookChangeSummary =
  | { kind: "replaced"; prev: unknown; next: unknown }
  | { kind: "changed-fields" }
  | { kind: "equal" };

// mirrors react-devtools-shared Profiler/WhatChanged.js
export type RenderReason =
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

// one group per exact display name, slowest total first; null when nothing mounted
function buildMountedLine(mounted: CommitHistoryFiberChange[]): HistoryLine | null {
  if (mounted.length === 0) return null;
  const groupsByName = new Map<string | null, MountedGroup>();
  for (const { displayName, selfDuration } of mounted) {
    const group = groupsByName.get(displayName);
    if (group == null) {
      groupsByName.set(displayName, { displayName, count: 1, selfDuration });
    } else {
      group.count += 1;
      group.selfDuration += selfDuration;
    }
  }
  const components = [...groupsByName.values()].sort((a, b) => b.selfDuration - a.selfDuration);
  return { kind: "mounted", instanceCount: mounted.length, components };
}

// the hook line followed by one field line per changed field
function buildHookChangedLines(
  hook: CommitHistoryHookChange,
  underHooksReason: boolean,
): HistoryLine[] {
  const { hookName, ancestorPath } = splitHookPath(hook);
  const valueChange = buildValueChange(hook.prev, hook.next);
  const lines: HistoryLine[] = [
    {
      kind: "hook",
      hookIndex: hook.hookIndex,
      hookName,
      ancestorPath,
      changeSummary: buildChangeSummary(valueChange),
      underHooksReason,
    },
  ];
  for (const diff of valueChange.diffs ?? []) {
    lines.push({ kind: "field", ...diff, underHooksReason });
  }
  return lines;
}

function buildRenderReasonLine(reason: RenderReason): HistoryLine {
  return { kind: "render-reason", reason };
}

// the lines under a component line: render reasons in WhatChanged.js order
// (context → hooks → props → state, falling back to the parent); hook lines follow the hooks
// reason, or stand alone when it is the only reason
function buildComponentChangeLines(component: CommitHistoryFiberChange): HistoryLine[] {
  const { context, props, state } = component;
  const contextChanged = context === true || (Array.isArray(context) && context.length > 0);
  const propsChanged = props != null && props.length > 0;
  const stateChanged = state != null && state.length > 0;

  const lines: HistoryLine[] = [];
  if (contextChanged) {
    const keys = context === true ? null : context;
    lines.push(buildRenderReasonLine({ kind: "context-changed", keys }));
  }
  if (component.didHooksChange) {
    const hooks = component.hooks ?? [];
    // hook lines already say why it rendered: the reason only separates them from other reasons,
    // or stands in for them when none resolved
    const underHooksReason = hooks.length === 0 || contextChanged || propsChanged || stateChanged;
    if (underHooksReason) {
      lines.push(buildRenderReasonLine({ kind: "hooks-changed", hookCount: hooks.length }));
    }
    for (const hook of hooks) {
      lines.push(...buildHookChangedLines(hook, underHooksReason), {
        kind: "source",
        source: hook.source,
        underHooksReason,
      });
    }
  }
  if (propsChanged) {
    lines.push(buildRenderReasonLine({ kind: "props-changed", keys: props }));
  }
  if (stateChanged) {
    lines.push(buildRenderReasonLine({ kind: "state-changed", keys: state }));
  }
  if (lines.length === 0) lines.push(buildRenderReasonLine({ kind: "parent-rendered" }));
  return lines;
}

function buildHistorySummary(fiberChangesByCommit: CommitHistoryFiberChange[][]): HistorySummary {
  let totalDurationMs: number | null = null;
  let renderedComponentCount = 0;
  let mountedComponentCount = 0;
  for (const fiberChanges of fiberChangesByCommit) {
    renderedComponentCount += fiberChanges.length;
    for (const change of fiberChanges) {
      totalDurationMs = (totalDurationMs ?? 0) + change.selfDuration;
      if (change.isFirstMount) mountedComponentCount += 1;
    }
  }
  return {
    commitCount: fiberChangesByCommit.length,
    renderedComponentCount,
    mountedComponentCount,
    totalDurationMs,
  };
}

// walks commit → component → hook directly; every builder it calls returns finished lines
export function buildCommitHistoryLines(
  fiberChangesByCommit: CommitHistoryFiberChange[][],
): CommitHistoryLines {
  const lines: HistoryLine[] = [];
  for (const [index, fiberChanges] of fiberChangesByCommit.entries()) {
    lines.push({ kind: "commit", commitNumber: index + 1 });
    const components = [...fiberChanges].sort((a, b) => b.selfDuration - a.selfDuration);
    if (!components.some((change) => change.didHooksChange)) {
      lines.push({ kind: "no-hook-changes" });
    }

    const mountedLine = buildMountedLine(components.filter((change) => change.isFirstMount));
    if (mountedLine != null) lines.push(mountedLine);

    for (const component of components.filter((change) => !change.isFirstMount)) {
      lines.push(buildComponentLine(component), ...buildComponentChangeLines(component));
    }
  }
  return { summary: buildHistorySummary(fiberChangesByCommit), lines };
}
