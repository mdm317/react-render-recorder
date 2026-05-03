import type { CompareStatus } from "../lib/compare-types";

type CompareControlsProps = {
  onRefresh: () => Promise<void>;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  status: CompareStatus;
  statusText: string;
};

export function CompareControls({
  onRefresh,
  onStart,
  onStop,
  status,
  statusText,
}: CompareControlsProps) {
  const isFetching = status === "fetching";
  const isBusy = status === "startingRecording" || status === "stoppingRecording";
  const isRecording = status === "recording";

  return (
    <div className="topbar">
      <button
        type="button"
        className="primary"
        disabled={isBusy || status === "recording"}
        onClick={() => void onStart()}
      >
        {status === "startingRecording" ? "Starting…" : "Start Recording"}
      </button>
      <button
        type="button"
        disabled={!isRecording && status !== "stoppingRecording"}
        onClick={() => void onStop()}
      >
        {status === "stoppingRecording" ? "Stopping…" : "Stop Recording"}
      </button>
      <button type="button" disabled={isFetching || isBusy} onClick={() => void onRefresh()}>
        {isFetching ? "Fetching…" : "Fetch Comparison"}
      </button>
      <span className="status">{statusText}</span>
    </div>
  );
}
