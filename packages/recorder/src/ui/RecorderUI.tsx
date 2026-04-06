/** @jsxImportSource preact */

import { useId } from "preact/hooks";
import { useState } from "preact/hooks";

import type { RecorderUIOptions } from "./types";
import { useRecorderStore } from "./useRecorderStore";

export function RecorderUI({
  label = "react-record",
}: RecorderUIOptions) {
  const { recorderStore, state } = useRecorderStore();
  const { isRecording, commits } = state;
  const statusId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const commitCount = commits.length;
  const latestCommit = commits[commitCount - 1] ?? null;

  const recorderBadge = isRecording ? "LIVE" : "READY";
  const latestCommitLabel =
    latestCommit == null
      ? "No commits captured yet."
      : `Latest renderer: ${latestCommit.rendererID}`;
  const priorityLabel = latestCommit?.priorityLevel ?? "n/a";

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Collapsed pill toggle */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label} recorder. ${isRecording ? "Recording" : "Idle"}. Click to ${isExpanded ? "collapse" : "expand"}.`}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded((v) => !v);
          }
        }}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-full cursor-pointer text-xs font-semibold text-white shadow-lg select-none transition-colors duration-200 ${
          isRecording
            ? "bg-red-600 hover:bg-red-700"
            : "bg-slate-800 hover:bg-slate-700"
        }`}
      >
        <span
          className={`inline-block size-2 rounded-full ${
            isRecording ? "bg-white animate-pulse" : "bg-slate-400"
          }`}
        />
        {isRecording ? commitCount : "REC"}
      </div>

      {/* Expanded panel */}
      <section
        className={`w-72 grid gap-3 p-4 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/95 to-slate-100/90 shadow-xl ${
          isExpanded ? "" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block size-2.5 rounded-full ${
                isRecording ? "bg-red-500 animate-pulse" : "bg-slate-400"
              }`}
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
          className={`inline-flex items-center gap-2 w-fit px-4 py-2 rounded-full text-sm font-bold cursor-pointer border-none text-white transition-all duration-200 ${
            isRecording
              ? "bg-red-600 hover:bg-red-700 shadow-red-500/25 shadow-md"
              : "bg-teal-700 hover:bg-teal-800 shadow-teal-700/25 shadow-md"
          }`}
        >
          <span
            className={`inline-block size-2 rounded-full ${
              isRecording ? "bg-white animate-pulse" : "bg-white/70"
            }`}
          />
          {isRecording ? "Stop" : "Start"} recording
        </button>
      </section>
    </div>
  );
}
