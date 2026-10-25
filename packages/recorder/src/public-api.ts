import { buildCommitHistoryGroups } from "./lib/build-commit-history";
import type { CommittedFiberChange } from "@react-record/devtools-api";

import {
  type CommitHistoryFormatOptions,
  DEFAULT_COMMIT_HISTORY_FORMAT_OPTIONS,
} from "./features/options/recording-option";
import { buildCommitHistoryByPaint } from "./lib/format/build-commit-history-by-paint";
import { formatCommitHistoryForLLM } from "./lib/format/format-commit-history-for-llm";
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

function getPaintCommitIndices(store: RecorderStore): number[] {
  return [...store.getSnapshot().paintCommitIndices];
}

function getCommitHistoryText(store: RecorderStore, options: CommitHistoryFormatOptions): string {
  const fiberChangeGroupsByPaint = buildCommitHistoryGroups(store.getSnapshot());
  return formatCommitHistoryForLLM(fiberChangeGroupsByPaint.flat(), options);
}

function getCommitHistoryTextByPaint(
  store: RecorderStore,
  options: CommitHistoryFormatOptions,
): string[] {
  const fiberChangeGroupsByPaint = buildCommitHistoryGroups(store.getSnapshot());
  return buildCommitHistoryByPaint({
    fiberChangesByPaint: fiberChangeGroupsByPaint,
    ...options,
  });
}

export function exposeRecorderApi(store: RecorderStore): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>)[RECORDER_GLOBAL] = {
    start: () => startRecording(store),
    end: () => endRecording(store),
    getFiberChanges: () => getFiberChanges(store),
    getPaintCommitIndices: () => getPaintCommitIndices(store),
    getCommitHistoryText: (options: Partial<CommitHistoryFormatOptions> = {}) =>
      getCommitHistoryText(store, { ...DEFAULT_COMMIT_HISTORY_FORMAT_OPTIONS, ...options }),
    getCommitHistoryTextByPaint: (options: Partial<CommitHistoryFormatOptions> = {}) =>
      getCommitHistoryTextByPaint(store, { ...DEFAULT_COMMIT_HISTORY_FORMAT_OPTIONS, ...options }),
  };
}
