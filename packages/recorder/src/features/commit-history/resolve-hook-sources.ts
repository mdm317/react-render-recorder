import type { CommittedFiberChange } from "@react-record/devtools-api";
import {
  type HookSourceResolution,
  resolveHookCallerSource,
  resolveHookSource,
  type SourceInfo,
} from "@/features/source/resolve-hook-source";

type HookChange = NonNullable<CommittedFiberChange["hooks"]>[number];

export type CommitHistoryHookChange = HookChange & {
  source: HookSourceResolution;
  callerSource: HookSourceResolution;
};
export type CommitHistoryFiberChange = Omit<CommittedFiberChange, "hooks"> & {
  hooks: CommitHistoryHookChange[] | null;
};

export function resolveHookSources(
  fiberChanges: CommittedFiberChange[][],
  sourceInfo: SourceInfo | null = null,
): CommitHistoryFiberChange[][] {
  return fiberChanges.map((commit) =>
    commit.map((change) => ({
      ...change,
      hooks:
        change.hooks?.map((hook) => ({
          ...hook,
          source: resolveHookSource(hook, sourceInfo),
          callerSource: resolveHookCallerSource(hook, sourceInfo),
        })) ?? null,
    })),
  );
}
