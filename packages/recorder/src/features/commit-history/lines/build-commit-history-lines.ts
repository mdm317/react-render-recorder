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
  | { kind: "commit"; commitNumber: number }
  // no component in the commit changed a hook
  | { kind: "no-hook-changes" }
  // a component that changed a hook; its reason, hook and source lines follow
  | { kind: "component"; displayName: string | null; selfDuration: number }
  // components that rendered without a hook change, grouped by identical reasons;
  // follows the commit's hook-changed components
  | { kind: "render-group"; reasons: RenderReason[]; components: RenderGroupMember[] }
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
  // follows a hook line whose changeSummary is "changed-fields"
  | { kind: "field"; path: string; prev: unknown; next: unknown }
  | { kind: "source"; source: HookSourceResolution };

// members keep first-seen order; same-named components are counted and their selfDuration summed
export type RenderGroupMember = { displayName: string | null; count: number; selfDuration: number };

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
  return { kind: "component", displayName, selfDuration };
}

// the hook line followed by one field line per changed field
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
  for (const diff of valueChange.diffs ?? []) lines.push({ kind: "field", ...diff });
  return lines;
}

// render reasons other than hooks in WhatChanged.js order (context → props → state), falling back to
// the parent when nothing else, hooks included, changed; a first mount is its only reason
function buildRenderReasons(component: CommitHistoryFiberChange): RenderReason[] {
  if (component.isFirstMount) return [{ kind: "first-mount" }];

  const reasons: RenderReason[] = [];
  const { context } = component;
  if (context === true || (Array.isArray(context) && context.length > 0)) {
    reasons.push({ kind: "context-changed", keys: context === true ? null : context });
  }
  if (component.props != null && component.props.length > 0) {
    reasons.push({ kind: "props-changed", keys: component.props });
  }
  if (component.state != null && component.state.length > 0) {
    reasons.push({ kind: "state-changed", keys: component.state });
  }
  if (reasons.length === 0 && !component.didHooksChange) reasons.push({ kind: "parent-rendered" });
  return reasons;
}

// the lines under a hook-changed component line: the hooks reason with its hook lines goes
// after the context reason, matching WhatChanged.js (context → hooks → props → state)
function buildComponentChangeLines(component: CommitHistoryFiberChange): HistoryLine[] {
  const reasons = buildRenderReasons(component);
  const hooks = component.hooks ?? [];
  const hooksAt = reasons[0]?.kind === "context-changed" ? 1 : 0;
  const toLine = (reason: RenderReason): HistoryLine => ({ kind: "render-reason", reason });
  return [
    ...reasons.slice(0, hooksAt).map(toLine),
    toLine({ kind: "hooks-changed", hookCount: hooks.length }),
    ...hooks.flatMap((hook): HistoryLine[] => [
      ...buildHookChangedLines(hook),
      { kind: "source", source: hook.source },
    ]),
    ...reasons.slice(hooksAt).map(toLine),
  ];
}

// one render-group line per distinct reason combination, in first-seen order
function buildRenderGroupLines(components: CommitHistoryFiberChange[]): HistoryLine[] {
  const groups = new Map<
    string,
    { reasons: RenderReason[]; members: Map<string | null, RenderGroupMember> }
  >();
  for (const component of components) {
    const reasons = buildRenderReasons(component);
    const key = JSON.stringify(reasons);
    let group = groups.get(key);
    if (group == null) {
      group = { reasons, members: new Map() };
      groups.set(key, group);
    }
    const { displayName, selfDuration } = component;
    const member = group.members.get(displayName);
    if (member == null) {
      group.members.set(displayName, { displayName, count: 1, selfDuration });
    } else {
      member.count += 1;
      member.selfDuration += selfDuration;
    }
  }
  return [...groups.values()].map(({ reasons, members }) => ({
    kind: "render-group",
    reasons,
    components: [...members.values()],
  }));
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
    lines.push({ kind: "commit", commitNumber: index + 1 });
    const components = [...fiberChanges].sort((a, b) => b.selfDuration - a.selfDuration);
    const hookChangedComponents = components.filter((change) => change.didHooksChange);
    if (hookChangedComponents.length === 0) lines.push({ kind: "no-hook-changes" });

    for (const component of hookChangedComponents) {
      lines.push(buildComponentLine(component), ...buildComponentChangeLines(component));
    }
    lines.push(...buildRenderGroupLines(components.filter((change) => !change.didHooksChange)));
  }
  return { summary: buildHistorySummary(fiberChangesByCommit), lines };
}
