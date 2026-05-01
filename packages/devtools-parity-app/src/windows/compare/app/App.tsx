import type { CommittedFiberChange } from "@react-record/devtools-api";
import JsonView from "@uiw/react-json-view";
import { useCallback, useEffect, useState } from "react";

// Recorder strips the live `fiber`/`prevFiber` refs before serializing — see
// `getFiberChanges` in packages/recorder/src/services/recording.ts.
type SerializableFiberChange = Omit<CommittedFiberChange, "fiber" | "prevFiber">;

type FiberChangesResult = {
  capturedAt: number;
  error: string | null;
  fiberChanges: SerializableFiberChange[][] | null;
  fiberChangesAvailable: boolean;
  targetUrl: string | null;
};

type DevtoolsRankedSummaryCommit = {
  rootID: number;
  rootDisplayName: string;
  commitIndex: number;
  commitDuration: number;
  components: Array<{
    name: string;
    duration: number;
  }>;
};

type RankedProfilerSummaryResult = {
  data: DevtoolsRankedSummaryCommit[] | null;
  error: string | null;
};

type ControlResult = { ok: boolean; error: string | null };

type CompareApi = {
  fetchFiberChanges: () => Promise<FiberChangesResult>;
  recorderStart: () => Promise<ControlResult>;
  recorderEnd: () => Promise<ControlResult>;
  profilerStart: () => Promise<ControlResult>;
  profilerStop: () => Promise<ControlResult>;
};

const compareApi = (window as unknown as { api: CompareApi }).api;

function getRankedProfilerSummary(): Promise<RankedProfilerSummaryResult> {
  const parity = window.__REACT_DEVTOOLS_PARITY__;
  if (!parity) {
    return Promise.resolve({
      data: null,
      error: "window.__REACT_DEVTOOLS_PARITY__ is not installed.",
    });
  }
  return parity.getRankedProfilerSummary();
}

function describeFiberChanges(fiberChanges: SerializableFiberChange[][] | null): string {
  if (fiberChanges == null) return "no fiberChanges captured yet.";
  const totalChanges = fiberChanges.reduce((sum, commit) => sum + commit.length, 0);
  return `${fiberChanges.length} commits, ${totalChanges} total fiber changes.`;
}

function describeRankedSummary(commits: DevtoolsRankedSummaryCommit[] | null): string {
  if (commits == null || commits.length === 0) return "no ranked summary available yet.";
  const totalComponents = commits.reduce((sum, commit) => sum + commit.components.length, 0);
  return `${commits.length} commit(s), ${totalComponents} ranked component entries.`;
}

type PaneProps = {
  title: string;
  summary: string;
  available: boolean;
  data: unknown;
  emptyMessage: string;
  errorMessage: string | null;
};

function Pane({ title, summary, available, data, emptyMessage, errorMessage }: PaneProps) {
  return (
    <section className="pane">
      <h2>{title}</h2>
      <div className="summary">{summary}</div>
      {errorMessage ? (
        <div className="error">{errorMessage}</div>
      ) : available ? (
        <div className="pane-body">
          <JsonView
            value={data as object}
            collapsed={2}
            displayDataTypes={false}
            shortenTextAfterLength={120}
          />
        </div>
      ) : (
        <div className="empty">{emptyMessage}</div>
      )}
    </section>
  );
}

type RecordingState = "idle" | "starting" | "recording" | "stopping";

function describeControlError(label: string, result: ControlResult | null): string | null {
  if (result == null || result.ok) return null;
  return `${label}: ${result.error ?? "unknown error"}`;
}

export function App() {
  const [result, setResult] = useState<FiberChangesResult | null>(null);
  const [rankedSummary, setRankedSummary] = useState<RankedProfilerSummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ipcError, setIpcError] = useState<string | null>(null);
  const [recState, setRecState] = useState<RecordingState>("idle");
  const [recorderControlResult, setRecorderControlResult] = useState<ControlResult | null>(null);
  const [profilerControlResult, setProfilerControlResult] = useState<ControlResult | null>(null);

  const handleFetch = useCallback(async () => {
    setLoading(true);
    setIpcError(null);
    try {
      const [next, ranked] = await Promise.all([
        compareApi.fetchFiberChanges(),
        getRankedProfilerSummary(),
      ]);
      setResult(next);
      setRankedSummary(ranked);
    } catch (err) {
      setIpcError((err as Error).message || String(err));
      setResult(null);
      setRankedSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStart = useCallback(async () => {
    setRecState("starting");
    setRecorderControlResult(null);
    setProfilerControlResult(null);
    try {
      const [rec, prof] = await Promise.all([
        compareApi.recorderStart(),
        compareApi.profilerStart(),
      ]);
      setRecorderControlResult(rec);
      setProfilerControlResult(prof);
      setRecState("recording");
    } catch (err) {
      setIpcError((err as Error).message || String(err));
      setRecState("idle");
    }
  }, []);

  const handleStop = useCallback(async () => {
    setRecState("stopping");
    try {
      const [rec, prof] = await Promise.all([compareApi.recorderEnd(), compareApi.profilerStop()]);
      setRecorderControlResult(rec);
      setProfilerControlResult(prof);
    } catch (err) {
      setIpcError((err as Error).message || String(err));
    } finally {
      setRecState("idle");
    }
    void handleFetch();
  }, [handleFetch]);

  useEffect(() => {
    void handleFetch();
  }, [handleFetch]);

  const controlErrors = [
    describeControlError("recorder", recorderControlResult),
    describeControlError("devtools profiler", profilerControlResult),
  ]
    .filter(Boolean)
    .join(" · ");

  let statusText = "Ready.";
  if (recState === "starting") {
    statusText = "Starting recording…";
  } else if (recState === "recording") {
    statusText = controlErrors
      ? `Recording (with errors: ${controlErrors})`
      : "Recording — click Stop to finish.";
  } else if (recState === "stopping") {
    statusText = "Stopping recording…";
  } else if (loading) {
    statusText = "Fetching from target page…";
  } else if (ipcError) {
    statusText = `IPC error: ${ipcError}`;
  } else if (controlErrors) {
    statusText = `Last control error: ${controlErrors}`;
  } else if (result?.error) {
    statusText = result.error;
  } else if (result) {
    const ts = new Date(result.capturedAt).toLocaleTimeString();
    const targetSuffix = result.targetUrl ? ` · ${result.targetUrl}` : "";
    statusText = `Fetched at ${ts}${targetSuffix}`;
  }

  const fatalError = ipcError ?? result?.error ?? null;
  const isRecording = recState === "recording";
  const isBusy = recState === "starting" || recState === "stopping";

  return (
    <div className="layout">
      <div className="topbar">
        <button
          type="button"
          className="primary"
          disabled={isBusy || recState === "recording"}
          onClick={() => void handleStart()}
        >
          {recState === "starting" ? "Starting…" : "Start Recording"}
        </button>
        <button
          type="button"
          disabled={!isRecording && recState !== "stopping"}
          onClick={() => void handleStop()}
        >
          {recState === "stopping" ? "Stopping…" : "Stop Recording"}
        </button>
        <button type="button" disabled={loading || isBusy} onClick={() => void handleFetch()}>
          {loading ? "Fetching…" : "Fetch Comparison"}
        </button>
        <span className="status">{statusText}</span>
      </div>
      <div className="panes">
        <Pane
          title="recorder fiberChanges (raw)"
          summary={result ? describeFiberChanges(result.fiberChanges) : "—"}
          available={Boolean(result?.fiberChangesAvailable)}
          data={result?.fiberChanges}
          emptyMessage="No fiber changes captured yet. Click Start Recording, interact with the target page, then Stop Recording."
          errorMessage={fatalError}
        />
        <Pane
          title="react-devtools ranked summary (Profiler UI)"
          summary={describeRankedSummary(rankedSummary?.data ?? null)}
          available={Boolean(rankedSummary?.data && rankedSummary.data.length > 0)}
          data={rankedSummary?.data}
          emptyMessage="Ranked summary comes from the standalone DevTools profilingCache. Empty until the Profiler has processed data."
          errorMessage={rankedSummary?.error ?? fatalError}
        />
      </div>
    </div>
  );
}
