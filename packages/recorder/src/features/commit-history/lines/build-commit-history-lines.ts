import type {
  CommitHistoryFiberChange,
  CommitHistoryHookChange,
} from "@/features/commit-history/resolve-hook-sources";
import type { CommitHistoryFormatOptions } from "@/features/options/recording-option";
import type { HookSourceResolution } from "@/features/source/resolve-hook-source";
import { formatDurationMsInline } from "@/utils/format-duration";
import { buildValueChange, type FieldDiff, type ValueChange } from "./build-value-change";
import { formatHookValue, formatValueForLLM } from "./value-formatting";

export type FormatOptionKey = keyof CommitHistoryFormatOptions;
// display text that is printed only while options[option] is on
export type OptionGated<K extends FormatOptionKey> = { option: K; value: string };

export type CommitHistoryLines = { summary: HistorySummary; lines: HistoryLine[] };
// totalDurationText sums every fiber, not just the hook-changed components
export type HistorySummary = {
  commitCount: number;
  // every rendered component, printed regardless of options
  renderedComponentCount: number;
  totalDurationText: string;
};

// one entry per logical line; the printer decides how many text lines each one takes
// (commit adds a blank separator, a disabled source prints nothing).
// Components within a commit are sorted by descending selfDuration.
export type HistoryLine =
  | { kind: "commit"; commitNumber: number }
  // printed only while includeAllRenders is off
  | { kind: "no-hook-changes" }
  | {
      kind: "component";
      displayName: string;
      // false: no hook change, so the component is printed only with includeAllRenders
      hookChanged: boolean;
      durationText: OptionGated<"includeRenderDuration">;
    }
  | {
      kind: "hook";
      hookIndex: number;
      hookName: string;
      // null when the hook has no ancestor hooks
      ancestorPathText: OptionGated<"includeHookPath"> | null;
      changeSummary: HookChangeSummary;
    }
  // printed under its component in DevTools' "Why did this render?" order, only with includeAllRenders
  | { kind: "render-reason"; reason: RenderReason }
  // follows a hook line whose changeSummary is "changed-fields"
  | { kind: "field"; path: string; prev: string; next: string }
  | { kind: "source"; sourceText: OptionGated<"includeSource"> };

export type HookChangeSummary =
  | { kind: "replaced"; prev: string; next: string }
  | { kind: "changed-fields" }
  | { kind: "equal" };

// mirrors react-devtools-shared Profiler/WhatChanged.js
export type RenderReason =
  | { kind: "first-mount" }
  // keys: null when React only reports that some context changed
  | { kind: "context-changed"; keys: string[] | null }
  // hookCount: the hook lines that follow; 0 prints no ":", 1 prints "Hook" singular
  | { kind: "hooks-changed"; hookCount: number }
  | { kind: "props-changed"; keys: string[] }
  | { kind: "state-changed"; keys: string[] }
  | { kind: "parent-rendered" };

const ANCESTOR_HOOK_PATTERN = /^(.+?)\("(.+)"\)$/;

const ANONYMOUS_DISPLAY_NAME = "Anonymous";

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

// null for an empty ancestorPath; a single ancestor has its debug label parsed
// (['Floating("root")'] → 'Floating, debug="root"'), several are joined verbatim (["A", "B"] → "A > B")
function buildAncestorPathText(ancestorPath: string[]): string | null {
  if (ancestorPath.length === 0) return null;
  if (ancestorPath.length > 1) return ancestorPath.join(" > ");
  const match = ANCESTOR_HOOK_PATTERN.exec(ancestorPath[0]);
  return match == null ? ancestorPath[0] : `${match[1]}, debug="${match[2]}"`;
}

const SOURCE_PATH_SEGMENT_LIMIT = 3;

// Keeps the last few path segments, like zsh's `truncation_length`: `a/b/c/d` → `b/c/d`.
// `webpack-internal:///./src/App.tsx` splits into empty segments, so it lands on `./src/App.tsx`
function truncateSourcePath(fileName: string): string {
  return fileName.split("/").slice(-SOURCE_PATH_SEGMENT_LIMIT).join("/");
}

function buildSourceText(source: HookSourceResolution): string {
  switch (source.status) {
    case "pending":
      return "Resolving…";
    case "unavailable":
      return "Unavailable";
    case "unmapped": {
      const { fileName, lineNumber, columnNumber } = source.location;
      return `${truncateSourcePath(fileName)}:${lineNumber}:${columnNumber} (unmapped)`;
    }
    case "resolved": {
      const { fileName, lineNumber, columnNumber } = source.location;
      const librarySuffix = source.ignored ? " (library)" : "";
      return `${truncateSourcePath(fileName)}:${lineNumber}:${columnNumber}${librarySuffix}`;
    }
  }
}

function buildFieldLine(diff: FieldDiff): HistoryLine {
  return {
    kind: "field",
    path: diff.path,
    prev: formatValueForLLM(diff.prev),
    next: formatValueForLLM(diff.next),
  };
}

function buildChangeSummary({ prev, next, diffs }: ValueChange): HookChangeSummary {
  if (diffs == null) {
    return { kind: "replaced", prev: formatHookValue(prev), next: formatHookValue(next) };
  }
  return diffs.length === 0 ? { kind: "equal" } : { kind: "changed-fields" };
}

// nameless components print as "Anonymous" like DevTools
function buildComponentLine(component: CommitHistoryFiberChange): HistoryLine {
  const { displayName, selfDuration } = component;
  return {
    kind: "component",
    displayName: displayName ?? ANONYMOUS_DISPLAY_NAME,
    hookChanged: component.didHooksChange,
    durationText: { option: "includeRenderDuration", value: formatDurationMsInline(selfDuration) },
  };
}

// the hook line followed by one field line per changed field
function buildHookChangedLines(hook: CommitHistoryHookChange): HistoryLine[] {
  const { hookName, ancestorPath } = splitHookPath(hook);
  const ancestorPathText = buildAncestorPathText(ancestorPath);
  const valueChange = buildValueChange(hook.prev, hook.next);
  const lines: HistoryLine[] = [
    {
      kind: "hook",
      hookIndex: hook.hookIndex,
      hookName,
      ancestorPathText:
        ancestorPathText == null ? null : { option: "includeHookPath", value: ancestorPathText },
      changeSummary: buildChangeSummary(valueChange),
    },
  ];
  for (const diff of valueChange.diffs ?? []) lines.push(buildFieldLine(diff));
  return lines;
}

function buildSourceLine(source: HookSourceResolution): HistoryLine {
  return {
    kind: "source",
    sourceText: { option: "includeSource", value: buildSourceText(source) },
  };
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
      lines.push(...buildHookChangedLines(hook), buildSourceLine(hook.source));
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
    totalDurationText: formatDurationMsInline(totalDurationMs),
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

    for (const component of components) {
      lines.push(buildComponentLine(component), ...buildComponentChangeLines(component));
    }
  }
  return { summary: buildHistorySummary(fiberChangesByCommit), lines };
}
