import type { CommittedFiberChange } from "@react-record/devtools-api";

import { buildCommitHistoryTextByPaint } from "../lib/build-commit-segments-by-paint";
import { buildFilteredCommits } from "../lib/build-filtered-commits";
import { formatCommitHookChangedHistoryForLLM } from "../lib/llm-logging/format-commit-hook-changed-history-for-llm";
import { endRecording, startRecording } from "../services/recording";
import type { RecorderStore } from "../store";

const RECORDER_GLOBAL = "__REACT_RENDER_RECORDER__";

export type SerializableFiberChange = Omit<CommittedFiberChange, "fiber" | "prevFiber">;

function getFiberChanges(store: RecorderStore): SerializableFiberChange[][] {
  return store
    .getSnapshot()
    .fiberChanges.map((commitChanges) =>
      commitChanges.map(({ fiber: _fiber, prevFiber: _prevFiber, ...rest }) => rest),
    );
}

function getCommitHistoryText(store: RecorderStore): string {
  const { fiberChanges, paintCommitIndices } = store.getSnapshot();
  const { filteredFiberChanges } = buildFilteredCommits({ fiberChanges, paintCommitIndices });
  return formatCommitHookChangedHistoryForLLM(filteredFiberChanges);
}

function getCommitHistoryTextByPaint(store: RecorderStore): string[] {
  const { fiberChanges, paintCommitIndices } = store.getSnapshot();
  const { filteredFiberChanges, filteredPaintCommitIndices } = buildFilteredCommits({
    fiberChanges,
    paintCommitIndices,
  });
  return buildCommitHistoryTextByPaint({
    fiberChanges: filteredFiberChanges,
    paintCommitIndices: filteredPaintCommitIndices,
  });
}

export function exposeRecorderApi(store: RecorderStore): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>)[RECORDER_GLOBAL] = {
    start: () => startRecording(store),
    end: () => endRecording(store),
    getFiberChanges: () => getFiberChanges(store),
    getCommitHistoryText: () => getCommitHistoryText(store),
    getCommitHistoryTextByPaint: () => getCommitHistoryTextByPaint(store),
  };
}
