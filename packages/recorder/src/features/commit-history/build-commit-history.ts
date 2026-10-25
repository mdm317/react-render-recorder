import type { CommittedFiberChange } from "@react-record/devtools-api";
import { groupCommitsByPaint } from "./group-commits-by-paint";
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

export function buildCommitHistory(
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

export function buildCommitHistoryGroups({
  fiberChanges,
  paintCommitIndices,
  ...sourceInfo
}: SourceInfo & {
  fiberChanges: CommittedFiberChange[][];
  paintCommitIndices: number[];
}): CommitHistoryFiberChange[][][] {
  return groupCommitsByPaint({ fiberChangesByCommit: fiberChanges, paintCommitIndices }).map(
    (commits) => buildCommitHistory(commits, sourceInfo),
  );
}
