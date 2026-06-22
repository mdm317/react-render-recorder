import type { CommittedFiberChange } from "@react-record/devtools-api";

import type { RecorderOptions } from "@/types";
import { buildCommitHistoryByPaint } from "../lib/format/build-commit-history-by-paint";
import { groupCommitsByPaint } from "../lib/group-commits-by-paint";
import { formatCommitHistoryForLLM } from "../lib/format/format-commit-history-for-llm";
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

function getPaintCommitIndices(store: RecorderStore): number[] {
  return [...store.getSnapshot().paintCommitIndices];
}

function getCommitHistoryText(store: RecorderStore, options: RecorderOptions): string {
  const { fiberChanges, paintCommitIndices } = store.getSnapshot();
  const fiberChangeGroupsByPaint = groupCommitsByPaint({
    fiberChangesByCommit: fiberChanges,
    paintCommitIndices,
  });
  return formatCommitHistoryForLLM(fiberChangeGroupsByPaint.flat(), options);
}

function getCommitHistoryTextByPaint(store: RecorderStore, options: RecorderOptions): string[] {
  const { fiberChanges, paintCommitIndices } = store.getSnapshot();
  const fiberChangeGroupsByPaint = groupCommitsByPaint({
    fiberChangesByCommit: fiberChanges,
    paintCommitIndices,
  });
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
    getCommitHistoryText: (
      options: RecorderOptions = { includeRenderDuration: false, includeHookPath: false },
    ) => getCommitHistoryText(store, options),
    getCommitHistoryTextByPaint: (
      options: RecorderOptions = { includeRenderDuration: false, includeHookPath: false },
    ) => getCommitHistoryTextByPaint(store, options),
  };
}
