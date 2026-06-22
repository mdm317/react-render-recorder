import type { CommittedFiberChange } from "@react-record/devtools-api";
import { formatDurationMsInline } from "../../../utils/format-duration";
import { isPlainArray, isPlainObject } from "../../../utils/type-guards";
import { buildObjectDiffLines } from "./build-object-diff";
import { type HookChange, formatHookLabel } from "./format-hook-label";
import { formatHookValue } from "./value-formatting";
import type { RecorderOptions } from "@/types";

type ComponentWithHookChanges = CommittedFiberChange & {
  displayName: string;
  hooks: NonNullable<CommittedFiberChange["hooks"]>;
};

function isComponentWithHookChanges(
  component: CommittedFiberChange,
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

function formatHookBulletLines(hook: HookChange, includeHookPath: boolean): string[] {
  // hook display name (useState → "State"), or "State (in HookCounter)" when includeHookPath is on
  const hookLabel = formatHookLabel(hook, includeHookPath);
  const [summary, ...diffLines] = formatHookDiffLines(hook.prev, hook.next);
  return [`  - hook[${hook.hookIndex}] ${hookLabel}: ${summary}`, ...diffLines];
}

export function buildCommitSectionLines(
  fiberChanges: CommittedFiberChange[],
  options: RecorderOptions = { includeRenderDuration: false, includeHookPath: false },
): string[] {
  const changedComponents = fiberChanges.filter(isComponentWithHookChanges);
  if (changedComponents.length === 0) return ["(no hook changes)"];
  return changedComponents.flatMap((component) => {
    const durationSuffix = options.includeRenderDuration
      ? ` (${formatDurationMsInline(component.selfDuration)})`
      : "";
    return [
      `- ${component.displayName}${durationSuffix}:`,
      ...component.hooks.flatMap((hook) => formatHookBulletLines(hook, options.includeHookPath)),
    ];
  });
}
