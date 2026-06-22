import type { CommittedFiberChange } from "@react-record/devtools-api";

export type HookChange = NonNullable<CommittedFiberChange["hooks"]>[number];

const WRAPPER_HOOK_PATTERN = /^(.+?)\("(.+)"\)$/;

export function formatHookLabel(hook: HookChange, includeHookPath: boolean): string {
  const hookPath = "hookPath" in hook ? hook.hookPath : null;
  const hookName = "hookName" in hook ? hook.hookName : null;

  if (hookPath != null && hookPath.length > 0) {
    const leaf = hookPath[hookPath.length - 1];
    if (!includeHookPath) return leaf;
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
