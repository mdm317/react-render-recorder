import type { CommittedFiberChange, SourceMappedLocation } from "@react-record/devtools-api";
import {
  getHookSourceLocation,
  getKeyFromHookSource,
  type SourceResults,
} from "./inspect-symbolicate-source";

type HookChange = NonNullable<CommittedFiberChange["hooks"]>[number];

export type HookSourceResolution =
  | { status: "pending" }
  | { status: "unavailable" }
  | { status: "unmapped"; location: { fileName: string; lineNumber: number; columnNumber: number } }
  | { status: "resolved"; location: SourceMappedLocation };

export type CommitHistoryHookChange = HookChange & { source: HookSourceResolution };
export type CommitHistoryFiberChange = Omit<CommittedFiberChange, "hooks"> & {
  hooks: CommitHistoryHookChange[] | null;
};

function prepareSource(
  hook: HookChange,
  sourceResults: SourceResults | null,
): HookSourceResolution {
  const source = getHookSourceLocation(hook);
  if (source == null) return { status: "unavailable" };
  const result = sourceResults?.[getKeyFromHookSource(source)];
  if (result === undefined) return { status: "pending" };
  if (result === null)
    return {
      status: "unmapped",
      location: {
        fileName: source.fileName,
        lineNumber: source.lineNumber,
        columnNumber: source.columnNumber,
      },
    };
  return { status: "resolved", location: result };
}

export function buildCommitHistory(
  fiberChanges: CommittedFiberChange[][],
  sourceResults: SourceResults | null = null,
): CommitHistoryFiberChange[][] {
  return fiberChanges.map((commit) =>
    commit.map((change) => ({
      ...change,
      hooks:
        change.hooks?.map((hook) => ({
          ...hook,
          source: prepareSource(hook, sourceResults),
        })) ?? null,
    })),
  );
}
