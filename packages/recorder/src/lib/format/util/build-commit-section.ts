import type {
  CommitHistoryFiberChange,
  CommitHistoryHookChange,
  HookSourceResolution,
} from "../../build-commit-history";
import { formatDurationMsInline } from "../../../utils/format-duration";
import { isPlainArray, isPlainObject } from "../../../utils/type-guards";
import { buildObjectDiffLines } from "./build-object-diff";
import { formatHookLabel } from "./format-hook-label";
import { formatHookValue } from "./value-formatting";
import type { CommitHistoryFormatOptions } from "@/types";

type ComponentWithHookChanges = CommitHistoryFiberChange & {
  displayName: string;
  hooks: NonNullable<CommitHistoryFiberChange["hooks"]>;
};

function isComponentWithHookChanges(
  component: CommitHistoryFiberChange,
): component is ComponentWithHookChanges {
  return component.displayName != null && component.hooks != null && component.hooks.length > 0;
}

function formatHookDiffLines(prev: unknown, next: unknown): string[] {
  const bothObjects = isPlainObject(prev) && isPlainObject(next);
  const bothArrays = isPlainArray(prev) && isPlainArray(next);
  if (!bothObjects && !bothArrays) {
    return [`${formatHookValue(prev)} → ${formatHookValue(next)}`];
  }

  return buildObjectDiffLines(prev, next);
}

function formatSource(source: HookSourceResolution): string {
  switch (source.status) {
    case "pending":
      return "Resolving…";
    case "unavailable":
      return "Unavailable";
    case "unmapped": {
      const { fileName, lineNumber, columnNumber } = source.location;
      return `${fileName.replace(/^https?:\/\/[^/?#]+/i, "")}:${lineNumber}:${columnNumber} (unmapped)`;
    }
    case "resolved": {
      const [, fileName, lineNumber, columnNumber] = source.location.location;
      return `${fileName.replace(/^https?:\/\/[^/?#]+/i, "")}:${lineNumber}:${columnNumber}`;
    }
  }
}

function formatHookBulletLines(
  hook: CommitHistoryHookChange,
  options: CommitHistoryFormatOptions,
): string[] {
  // hook display name (useState → "State"), or "State (in HookCounter)" when includeHookPath is on
  const hookLabel = formatHookLabel(hook, options.includeHookPath);
  const [summary, ...diffLines] = formatHookDiffLines(hook.prev, hook.next);
  const lines = [`  - hook[${hook.hookIndex}] ${hookLabel}: ${summary}`, ...diffLines];
  if (options.includeSource) {
    lines.push(`    Source: ${formatSource(hook.source)}`);
  }
  return lines;
}

export function buildCommitSectionLines(
  fiberChanges: CommitHistoryFiberChange[],
  options: CommitHistoryFormatOptions = {
    includeRenderDuration: false,
    includeHookPath: false,
    includeSource: false,
  },
): string[] {
  const changedComponents = fiberChanges
    .filter(isComponentWithHookChanges)
    .sort((a, b) => (b.selfDuration ?? 0) - (a.selfDuration ?? 0));
  if (changedComponents.length === 0) return ["(no hook changes)"];
  return changedComponents.flatMap((component) => {
    const durationSuffix = options.includeRenderDuration
      ? ` (${formatDurationMsInline(component.selfDuration)})`
      : "";
    return [
      `- ${component.displayName}${durationSuffix}:`,
      ...component.hooks.flatMap((hook) => formatHookBulletLines(hook, options)),
    ];
  });
}
