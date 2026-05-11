import type { CommittedFiberChange } from "@react-record/devtools-api";
import {
  createSafeJsonReplacer,
  formatElementSummary,
  isElementLike,
} from "../../../utils/safe-json";

type HookChange = NonNullable<CommittedFiberChange["hooks"]>[number];

type ComponentWithHookChanges = CommittedFiberChange & {
  displayName: string;
  hooks: NonNullable<CommittedFiberChange["hooks"]>;
};

function isComponentWithHookChanges(
  component: CommittedFiberChange,
): component is ComponentWithHookChanges {
  return component.displayName != null && component.hooks != null && component.hooks.length > 0;
}

function isFormattedElementSummaryString(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("[HTMLElement ") && value.endsWith("]");
}

function elementSummaryToShortForm(formatted: string): string {
  return `[${formatted.slice("[HTMLElement ".length, -1)}]`;
}

function formatValueForLLM(value: unknown): string {
  if (value === undefined) return "undefined";
  if (isFormattedElementSummaryString(value)) return elementSummaryToShortForm(value);
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return JSON.stringify(value);
  }
  if (isElementLike(value)) return elementSummaryToShortForm(formatElementSummary(value));
  const serialized = JSON.stringify(value, createSafeJsonReplacer());
  return serialized ?? String(value);
}

const WRAPPER_HOOK_PATTERN = /^(.+?)\("(.+)"\)$/;

function formatHookLabel(hook: HookChange): string {
  const hookPath = "hookPath" in hook ? hook.hookPath : null;
  const hookName = "hookName" in hook ? hook.hookName : null;

  if (hookPath != null && hookPath.length > 0) {
    const leaf = hookPath[hookPath.length - 1];
    const wrappers = hookPath.slice(0, -1);
    if (wrappers.length === 0) return leaf;
    if (wrappers.length === 1) {
      const match = WRAPPER_HOOK_PATTERN.exec(wrappers[0]);
      return match == null
        ? `${leaf} (in ${wrappers[0]})`
        : `${leaf} (in ${match[1]}, debug="${match[2]}")`;
    }
    return `${leaf} (in ${wrappers.join(" > ")})`;
  }

  return hookName ?? "";
}

function isPlainArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type PathDiff = { path: string; prev: unknown; next: unknown };

function joinPath(base: string, segment: string): string {
  if (base === "") return segment;
  if (segment.startsWith("[")) return `${base}${segment}`;
  return `${base}.${segment}`;
}

function collectPathDiffs(prev: unknown, next: unknown, base: string, out: PathDiff[]): void {
  if (Object.is(prev, next)) return;

  const prevIsArray = isPlainArray(prev);
  const nextIsArray = isPlainArray(next);
  if (prevIsArray && nextIsArray) {
    if (prev.length !== next.length) {
      out.push({ path: joinPath(base, "length"), prev: prev.length, next: next.length });
    }
    const overlap = Math.min(prev.length, next.length);
    for (let i = 0; i < overlap; i += 1) {
      collectPathDiffs(prev[i], next[i], joinPath(base, `[${i}]`), out);
    }
    return;
  }

  const prevIsObject = isPlainObject(prev);
  const nextIsObject = isPlainObject(next);
  if (prevIsObject && nextIsObject) {
    const seen = new Set<string>();
    for (const key of Object.keys(prev)) {
      seen.add(key);
      if (!(key in next)) {
        out.push({ path: joinPath(base, key), prev: prev[key], next: undefined });
        continue;
      }
      collectPathDiffs(prev[key], next[key], joinPath(base, key), out);
    }
    for (const key of Object.keys(next)) {
      if (seen.has(key)) continue;
      if (!(key in prev)) {
        out.push({ path: joinPath(base, key), prev: undefined, next: next[key] });
      }
    }
    return;
  }

  out.push({ path: base, prev, next });
}

function formatDiffSide(value: unknown): string {
  if (value === undefined) return "undefined";
  return formatValueForLLM(value);
}

function tryFormatPathDiff(prev: unknown, next: unknown): string[] | null {
  const prevIsArray = isPlainArray(prev);
  const nextIsArray = isPlainArray(next);
  const prevIsObject = isPlainObject(prev);
  const nextIsObject = isPlainObject(next);

  const sameArray = prevIsArray && nextIsArray;
  const sameObject = prevIsObject && nextIsObject;
  if (!sameArray && !sameObject) return null;

  const diffs: PathDiff[] = [];
  collectPathDiffs(prev, next, "", diffs);
  return diffs.map(
    (diff) => `    ${diff.path}: ${formatDiffSide(diff.prev)} → ${formatDiffSide(diff.next)}`,
  );
}

function formatComponentLines(component: ComponentWithHookChanges): string[] {
  const sortedHooks = component.hooks
    .slice()
    .sort((left, right) => left.hookIndex - right.hookIndex);

  return sortedHooks.flatMap((hook) => {
    const label = formatHookLabel(hook);
    const tail = label === "" ? `hook[${hook.hookIndex}]` : `hook[${hook.hookIndex}] ${label}`;
    const pathLines = tryFormatPathDiff(hook.prev, hook.next);
    if (pathLines != null) {
      if (pathLines.length === 0) {
        return [`- ${component.displayName} ${tail}: {object equal — no path differs}`];
      }
      return [`- ${component.displayName} ${tail}: changed paths:`, ...pathLines];
    }
    return [
      `- ${component.displayName} ${tail}: ${formatValueForLLM(hook.prev)} → ${formatValueForLLM(hook.next)}`,
    ];
  });
}

export function getCommitSectionLines(fiberChanges: CommittedFiberChange[]): string[] {
  const changedComponents = fiberChanges.filter(isComponentWithHookChanges);
  if (changedComponents.length === 0) return ["(no hook changes)"];
  return changedComponents.flatMap(formatComponentLines);
}
