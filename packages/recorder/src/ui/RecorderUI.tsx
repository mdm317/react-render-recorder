/** @jsxImportSource preact */

import { useEffect, useId, useRef, useState } from "preact/hooks";

import { createRecorderStore } from "../store";
import type { RecorderUIOptions } from "./types";

export function RecorderUI({
  label = "react-record",
  initialRecording = false,
  store,
}: RecorderUIOptions) {
  const fallbackStoreRef = useRef(store ?? null);

  if (store == null && fallbackStoreRef.current == null) {
    fallbackStoreRef.current = createRecorderStore({ initialRecording });
  }

  const recorderStore = store ?? fallbackStoreRef.current;
  if (recorderStore == null) {
    throw new Error("Recorder store could not be initialized.");
  }

  const [snapshot, setSnapshot] = useState(() => recorderStore.getSnapshot());
  const { isRecording, commitCount, latestCommit } = snapshot;
  const statusId = useId();
  const recorderBadge = isRecording ? "LIVE" : "READY";
  const latestCommitLabel =
    latestCommit == null
      ? "No commits captured yet."
      : `Renderer ${latestCommit.rendererID} at ${new Date(latestCommit.timestamp).toLocaleTimeString()}`;
  const priorityLabel = latestCommit?.priorityLevel ?? "n/a";

  useEffect(() => {
    setSnapshot(recorderStore.getSnapshot());

    return recorderStore.subscribe(() => {
      setSnapshot(recorderStore.getSnapshot());
    });
  }, [recorderStore]);

  return (
    <section
      style={{
        display: "grid",
        gap: "1rem",
        padding: "1.25rem",
        borderRadius: "1rem",
        border: "1px solid rgba(15, 23, 42, 0.12)",
        background: "linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(226, 232, 240, 0.88))",
        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div style={{ display: "grid", gap: "0.35rem" }}>
        <strong style={{ fontSize: "1rem", color: "#0f172a" }}>{label}</strong>
        <p
          id={statusId}
          style={{
            margin: 0,
            color: "#475569",
            fontSize: "0.95rem",
          }}
        >
          {isRecording
            ? `Recording in progress. ${commitCount} commits captured.`
            : "Recorder is idle."}
        </p>
        <code
          style={{
            width: "fit-content",
            color: "#0f172a",
            background: "rgba(15, 23, 42, 0.08)",
          }}
        >
          devtools-api:{recorderBadge}
        </code>
        <p
          style={{
            margin: 0,
            color: "#334155",
            fontSize: "0.9rem",
          }}
        >
          {latestCommitLabel}
        </p>
        <p
          style={{
            margin: 0,
            color: "#64748b",
            fontSize: "0.82rem",
          }}
        >
          Latest priority: {priorityLabel}
        </p>
      </div>

      <button
        type="button"
        aria-describedby={statusId}
        onClick={() => {
          recorderStore.setRecording(!isRecording);
        }}
        style={{
          width: "fit-content",
          padding: "0.75rem 1rem",
          border: "none",
          borderRadius: "999px",
          fontWeight: 700,
          cursor: "pointer",
          color: "#fff",
          background: isRecording ? "#dc2626" : "#0f766e",
        }}
      >
        {isRecording ? "Stop" : "Start"} recording
      </button>
    </section>
  );
}
