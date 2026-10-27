import type {
  CommitHistoryFiberChange,
  CommitHistoryHookChange,
} from "@/features/commit-history/build-commit-history";
import type { CommitHistoryFormatOptions } from "@/features/options/recording-option";
import type { HookSourceResolution } from "@/features/source/resolve-hook-source";
import { formatDurationMsInline } from "@/utils/format-duration";
import { buildValueChange, type FieldDiff, type ValueChange } from "./build-value-change";
import { formatHookValue, formatValueForLLM } from "./value-formatting";

export type FormatOptionKey = keyof CommitHistoryFormatOptions;
// display text that is printed only while options[option] is on
export type OptionGated<K extends FormatOptionKey> = { option: K; value: string };

export type CommitHistoryLines = { summary: HistorySummary; lines: HistoryLine[] };
// totalDurationText sums every fiber, not just the selected components
export type HistorySummary = {
  commitCount: number;
  rerenderedComponentCount: number;
  totalDurationText: string;
};

// one entry per logical line; the printer decides how many text lines each one takes
// (commit adds a blank separator, a disabled source prints nothing).
// Components within a commit are sorted by descending selfDuration.
export type HistoryLine =
  | { kind: "commit"; commitNumber: number }
  | { kind: "no-hook-changes" }
  | {
      kind: "component";
      displayName: string;
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
  // follows a hook line whose changeSummary is "changed-fields"
  | { kind: "field"; path: string; prev: string; next: string }
  | { kind: "source"; sourceText: OptionGated<"includeSource"> };

export type HookChangeSummary =
  | { kind: "replaced"; prev: string; next: string }
  | { kind: "changed-fields" }
  | { kind: "equal" };

type SelectedFiberChange = CommitHistoryFiberChange & {
  displayName: string;
  hooks: CommitHistoryHookChange[];
};

const ANCESTOR_HOOK_PATTERN = /^(.+?)\("(.+)"\)$/;

function isSelectedChange(change: CommitHistoryFiberChange): change is SelectedFiberChange {
  return change.displayName != null && change.hooks != null && change.hooks.length > 0;
}

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

function buildSourceText(source: HookSourceResolution): string {
  switch (source.status) {
    case "pending":
      return "Resolving…";
    case "unavailable":
      return "Unavailable";
    case "unmapped": {
      const { fileName, lineNumber, columnNumber } = source.location;
      return `${fileName}:${lineNumber}:${columnNumber} (unmapped)`;
    }
    case "resolved": {
      const { fileName, lineNumber, columnNumber } = source.location;
      const librarySuffix = source.ignored ? " (library)" : "";
      return `${fileName}:${lineNumber}:${columnNumber}${librarySuffix}`;
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

function buildComponentLine({ displayName, selfDuration }: SelectedFiberChange): HistoryLine {
  return {
    kind: "component",
    displayName,
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

function buildHistorySummary(fiberChangesByCommit: CommitHistoryFiberChange[][]): HistorySummary {
  let totalDurationMs: number | null = null;
  let rerenderedComponentCount = 0;
  for (const commit of fiberChangesByCommit) {
    for (const change of commit) {
      if (isSelectedChange(change)) {
        rerenderedComponentCount++;
      }
      totalDurationMs = (totalDurationMs ?? 0) + change.selfDuration;
    }
  }
  return {
    commitCount: fiberChangesByCommit.length,
    rerenderedComponentCount,
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
    const components = fiberChanges
      .filter(isSelectedChange)
      .sort((a, b) => b.selfDuration - a.selfDuration);
    if (components.length === 0) lines.push({ kind: "no-hook-changes" });

    for (const component of components) {
      lines.push(buildComponentLine(component));
      for (const hook of component.hooks) {
        lines.push(...buildHookChangedLines(hook), buildSourceLine(hook.source));
      }
    }
  }
  return { summary: buildHistorySummary(fiberChangesByCommit), lines };
}
