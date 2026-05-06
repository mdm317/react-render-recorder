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

function formatComponentLines(component: ComponentWithHookChanges): string[] {
  const sortedHooks = component.hooks
    .slice()
    .sort((left, right) => left.hookIndex - right.hookIndex);

  return sortedHooks.map((hook) => {
    const label = formatHookLabel(hook);
    const tail = label === "" ? `hook[${hook.hookIndex}]` : `hook[${hook.hookIndex}] ${label}`;
    return `- ${component.displayName} ${tail}: ${formatValueForLLM(hook.prev)} → ${formatValueForLLM(hook.next)}`;
  });
}

export function getCommitSectionLines(fiberChanges: CommittedFiberChange[]): string[] {
  const changedComponents = fiberChanges.filter(isComponentWithHookChanges);
  if (changedComponents.length === 0) return ["(no hook changes)"];
  return changedComponents.flatMap(formatComponentLines);
}
