import { useCallback, useEffect, useState } from "react";

type ComparisonResult = {
  capturedAt: number;
  devtools: unknown;
  devtoolsAvailable: boolean;
  error: string | null;
  recorder: unknown;
  recorderAvailable: boolean;
  targetUrl: string | null;
};

type CompareApi = {
  fetchComparison: () => Promise<ComparisonResult>;
};

const compareApi = (window as unknown as { api: CompareApi }).api;

function formatJsonSafe(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (err) {
    return `// Failed to stringify: ${(err as Error).message}`;
  }
}

function describeRecorder(recorder: unknown): string {
  if (recorder == null || typeof recorder !== "object") return "no recorder snapshot.";
  const r = recorder as {
    commitCount?: number;
    paintCommitIndices?: unknown;
    isRecording?: boolean;
  };
  const commitCount = typeof r.commitCount === "number" ? r.commitCount : 0;
  const paintCount = Array.isArray(r.paintCommitIndices) ? r.paintCommitIndices.length : 0;
  const recordingText = r.isRecording ? " (still recording)" : "";
  return `${commitCount} commits, ${paintCount} paints${recordingText}.`;
}

function describeDevtools(devtools: unknown): string {
  if (devtools == null || typeof devtools !== "object") {
    return "no profilingData captured yet.";
  }
  const d = devtools as { dataForRoots?: unknown };
  if (!Array.isArray(d.dataForRoots)) return "profilingData present but no dataForRoots array.";
  const roots = d.dataForRoots as Array<{ commitData?: unknown[]; displayName?: string }>;
  const totalCommits = roots.reduce((sum, root) => {
    return sum + (Array.isArray(root.commitData) ? root.commitData.length : 0);
  }, 0);
  const rootNames = roots.map((root) => root.displayName ?? "Unknown").join(", ");
  return `${roots.length} root(s) [${rootNames}], ${totalCommits} total commits.`;
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

export function App() {
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ipcError, setIpcError] = useState<string | null>(null);

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

  useEffect(() => {
    void handleFetch();
  }, [handleFetch]);

  let statusText = "Ready.";
  if (loading) {
    statusText = "Fetching from target page…";
  } else if (ipcError) {
    statusText = `IPC error: ${ipcError}`;
  } else if (result?.error) {
    statusText = result.error;
  } else if (result) {
    const ts = new Date(result.capturedAt).toLocaleTimeString();
    const targetSuffix = result.targetUrl ? ` · ${result.targetUrl}` : "";
    statusText = `Fetched at ${ts}${targetSuffix}`;
  }

  const fatalError = ipcError ?? result?.error ?? null;

  return (
    <div className="layout">
      <div className="topbar">
        <button
          type="button"
          className="primary"
          disabled={loading}
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
          emptyMessage="window.__recorderSnapshot is not exposed yet. Make sure the recorder bundle is loaded and recording has been performed at least once."
          errorMessage={fatalError}
        />
        <Pane
          title="react-devtools profilingData"
          summary={result ? describeDevtools(result.devtools) : "—"}
          available={Boolean(result?.devtoolsAvailable)}
          data={result?.devtools}
          emptyMessage="window.__lastProfilingData not present yet. Run a Profiler recording in the standalone DevTools window first."
          errorMessage={fatalError}
        />
      </div>
    </div>
  );
}
