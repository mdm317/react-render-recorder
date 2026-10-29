import { resolveHookSources } from "./features/commit-history/resolve-hook-sources";
import { groupNonEmptyCommitsByPaint } from "./features/commit-history/group-non-empty-commits-by-paint";
import type { CommittedFiberChange } from "@react-record/devtools-api";

import {
  type CommitHistoryFormatOptions,
  DEFAULT_COMMIT_HISTORY_FORMAT_OPTIONS,
} from "./features/options/recording-option";
import { buildCommitHistoryLines } from "./features/commit-history/lines/build-commit-history-lines";
import { printCommitHistory } from "./features/commit-history/print/print-commit-history";
import { endRecording, startRecording } from "./features/recording/recording";
import type { RecorderStore } from "./features/recording/recorder-store";

const RECORDER_GLOBAL = "__REACT_RENDER_RECORDER__";

export type SerializableFiberChange = Omit<CommittedFiberChange, "fiber" | "prevFiber">;

function getFiberChanges(store: RecorderStore): SerializableFiberChange[][] {
  return store
    .getSnapshot()
    .fiberChanges.map((commitChanges) =>
      commitChanges.map(({ fiber: _fiber, prevFiber: _prevFiber, ...rest }) => rest),
    );
}

function getCommitHistoryText(store: RecorderStore, options: CommitHistoryFormatOptions): string {
  const { fiberChanges, paintCommitIndices, sourceResults, projectRoot } = store.getSnapshot();
  const commitsByPaint = groupNonEmptyCommitsByPaint({
    fiberChangesByCommit: resolveHookSources(fiberChanges, { sourceResults, projectRoot }),
    paintCommitIndices,
  });
  return printCommitHistory(buildCommitHistoryLines(commitsByPaint.flat()), options);
}

export function exposeRecorderApi(store: RecorderStore): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>)[RECORDER_GLOBAL] = {
    start: () => startRecording(store),
    end: () => endRecording(store),
    getFiberChanges: () => getFiberChanges(store),
    getCommitHistoryText: (options: Partial<CommitHistoryFormatOptions> = {}) =>
      getCommitHistoryText(store, { ...DEFAULT_COMMIT_HISTORY_FORMAT_OPTIONS, ...options }),
  };
}
