import { isPlainArray, isPlainObject } from "../../../utils/type-guards";
import { formatValueForLLM } from "./value-formatting";

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

export function buildObjectDiffLines(prev: unknown, next: unknown): string[] {
  const diffs: PathDiff[] = [];
  collectPathDiffs(prev, next, "", diffs);

  if (diffs.length === 0) return ["(equal)"];

  return [
    "changed fields:",
    ...diffs.map(
      (diff) => `      ${diff.path}: ${formatDiffSide(diff.prev)} → ${formatDiffSide(diff.next)}`,
    ),
  ];
}
