import type {
  DevtoolsRankedSummaryCommit,
  SerializableFiberChange,
} from "./build-commit-pairs";

export type FiberChangesResult = {
  capturedAt: number;
  error: string | null;
  fiberChanges: SerializableFiberChange[][] | null;
  fiberChangesAvailable: boolean;
  targetUrl: string | null;
};

export type RankedProfilerSummaryResult = {
  data: DevtoolsRankedSummaryCommit[] | null;
  error: string | null;
};

export type ControlResult = { ok: boolean; error: string | null };

export type CompareApi = {
  fetchRecorderFiberChanges: () => Promise<FiberChangesResult>;
  recorderStart: () => Promise<ControlResult>;
  recorderEnd: () => Promise<ControlResult>;
  profilerStart: () => Promise<ControlResult>;
  profilerStop: () => Promise<ControlResult>;
};

export type CompareStatus =
  | "idle"
  | "fetching"
  | "startingRecording"
  | "recording"
  | "stoppingRecording";

export type TabId = "parity" | "raw";
