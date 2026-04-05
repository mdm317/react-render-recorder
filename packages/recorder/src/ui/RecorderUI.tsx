/** @jsxImportSource preact */

import { useId } from "preact/hooks";

import type { RecorderUIOptions } from "./types";
import { useRecorderStore } from "./useRecorderStore";

export function RecorderUI({
  label = "react-record",
  initialRecording = false,
  store,
}: RecorderUIOptions) {
  const { recorderStore, state } = useRecorderStore({
    initialRecording,
    store,
  });
  const { isRecording, commitCount, latestCommit } = state;
  const statusId = useId();
  const recorderBadge = isRecording ? "LIVE" : "READY";
  const latestCommitLabel =
    latestCommit == null
      ? "No commits captured yet."
      : `Renderer ${latestCommit.rendererID} at ${new Date(latestCommit.timestamp).toLocaleTimeString()}`;
  const priorityLabel = latestCommit?.priorityLevel ?? "n/a";

  return (
    <section className="grid gap-4 p-5 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/95 to-slate-100/90 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-block size-2.5 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-slate-400"}`}
          />
          <strong className="text-sm font-semibold text-slate-900">
            {label}
          </strong>
        </div>
        <code className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-900/6 text-slate-600">
          devtools-api:{recorderBadge}
        </code>
      </div>

      <div className="grid gap-1.5">
        <p id={statusId} className="m-0 text-sm text-slate-500">
          {isRecording
            ? `Recording in progress. ${commitCount} commits captured.`
            : "Recorder is idle."}
        </p>
        <p className="m-0 text-xs text-slate-400">
          {latestCommitLabel}
        </p>
        <p className="m-0 text-xs text-slate-400">
          Latest priority: {priorityLabel}
        </p>
      </div>

      <button
        type="button"
        aria-describedby={statusId}
        onClick={() => {
          recorderStore.setRecording(!isRecording);
        }}
        className={`inline-flex items-center gap-2 w-fit px-4 py-2.5 rounded-full text-sm font-bold cursor-pointer border-none text-white transition-all duration-200 ${
          isRecording
            ? "bg-red-600 hover:bg-red-700 shadow-red-500/25 shadow-md"
            : "bg-teal-700 hover:bg-teal-800 shadow-teal-700/25 shadow-md"
        }`}
      >
        <span
          className={`inline-block size-2 rounded-full ${isRecording ? "bg-white animate-pulse" : "bg-white/70"}`}
        />
        {isRecording ? "Stop" : "Start"} recording
      </button>
    </section>
  );
}
