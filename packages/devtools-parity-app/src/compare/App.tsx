import { useCallback, useEffect, useState } from "react";

import type {
  RecorderSnapshot,
  SerializableFiberChange,
} from "../../../recorder/src/services/recording";

type ComparisonResult = {
  capturedAt: number;
  error: string | null;
  fiberChanges: SerializableFiberChange[][] | null;
  fiberChangesAvailable: boolean;
  recorder: RecorderSnapshot | null;
  recorderAvailable: boolean;
  targetUrl: string | null;
};

type ControlResult = { ok: boolean; error: string | null };

type CompareApi = {
  fetchComparison: () => Promise<ComparisonResult>;
  recorderStart: () => Promise<ControlResult>;
  recorderEnd: () => Promise<ControlResult>;
};

const compareApi = (window as unknown as { api: CompareApi }).api;

function formatJsonSafe(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (err) {
    return `// Failed to stringify: ${(err as Error).message}`;
  }
}

function describeRecorder(recorder: RecorderSnapshot | null): string {
  if (recorder == null) return "no recorder snapshot.";
  const recordingText = recorder.isRecording ? " (still recording)" : "";
  return `${recorder.commitCount} commits, ${recorder.paintCommitIndices.length} paints${recordingText}.`;
}

function describeFiberChanges(
  fiberChanges: SerializableFiberChange[][] | null,
): string {
  if (fiberChanges == null) return "no fiberChanges captured yet.";
  const totalChanges = fiberChanges.reduce((sum, commit) => sum + commit.length, 0);
  return `${fiberChanges.length} commits, ${totalChanges} total fiber changes.`;
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
        <pre>{formatJsonSafe(data)}</pre>
      ) : (
        <div className="empty">{emptyMessage}</div>
      )}
    </section>
  );
}

type RecordingState = "idle" | "starting" | "recording" | "stopping";

function describeControlError(
  label: string,
  result: ControlResult | null,
): string | null {
  if (result == null || result.ok) return null;
  return `${label}: ${result.error ?? "unknown error"}`;
}

export function App() {
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ipcError, setIpcError] = useState<string | null>(null);
  const [recState, setRecState] = useState<RecordingState>("idle");
  const [recorderControlResult, setRecorderControlResult] =
    useState<ControlResult | null>(null);

  const handleFetch = useCallback(async () => {
    setLoading(true);
    setIpcError(null);
    try {
      const next = await compareApi.fetchComparison();
      setResult(next);
    } catch (err) {
      setIpcError((err as Error).message || String(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStart = useCallback(async () => {
    setRecState("starting");
    setRecorderControlResult(null);
    try {
      const rec = await compareApi.recorderStart();
      setRecorderControlResult(rec);
      setRecState("recording");
    } catch (err) {
      setIpcError((err as Error).message || String(err));
      setRecState("idle");
    }
  }, []);

  const handleStop = useCallback(async () => {
    setRecState("stopping");
    try {
      const rec = await compareApi.recorderEnd();
      setRecorderControlResult(rec);
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

  const controlErrors = describeControlError("recorder", recorderControlResult) ?? "";

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
        <button
          type="button"
          disabled={loading || isBusy}
          onClick={() => void handleFetch()}
        >
          {loading ? "Fetching…" : "Fetch Comparison"}
        </button>
        <span className="status">{statusText}</span>
      </div>
      <div className="panes">
        <Pane
          title="packages/recorder snapshot"
          summary={result ? describeRecorder(result.recorder) : "—"}
          available={Boolean(result?.recorderAvailable)}
          data={result?.recorder}
          emptyMessage="window.__REACT_RENDER_RECORDER__ is not exposed yet. Make sure the recorder bundle is loaded and recording has been performed at least once."
          errorMessage={fatalError}
        />
        <Pane
          title="recorder fiberChanges (raw)"
          summary={result ? describeFiberChanges(result.fiberChanges) : "—"}
          available={Boolean(result?.fiberChangesAvailable)}
          data={result?.fiberChanges}
          emptyMessage="window.__REACT_RENDER_RECORDER__.getFiberChanges() returned no data. Make sure the recorder bundle is loaded and recording has run at least once."
          errorMessage={fatalError}
        />
      </div>
    </div>
  );
}
