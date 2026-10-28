import type { CommittedFiberChange } from "@react-record/devtools-api";
import {
  type HookSourceResolution,
  resolveHookSource,
  type SourceInfo,
} from "@/features/source/resolve-hook-source";

type HookChange = NonNullable<CommittedFiberChange["hooks"]>[number];

export type CommitHistoryHookChange = HookChange & { source: HookSourceResolution };
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
        })) ?? null,
    })),
  );
}
