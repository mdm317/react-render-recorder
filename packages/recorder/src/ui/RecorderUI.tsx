/** @jsxImportSource preact */

import { useId, useState } from "preact/hooks";

import type { RecorderUIOptions } from "./types";

export function RecorderUI({
  label = "react-record",
  initialRecording = false,
}: RecorderUIOptions) {
  const [isRecording, setIsRecording] = useState(initialRecording);
  const statusId = useId();
  const recorderBadge = isRecording ? "LIVE" : "READY";

  return (
    <section
      style={{
        display: "grid",
        gap: "1rem",
        padding: "1.25rem",
        borderRadius: "1rem",
        border: "1px solid rgba(15, 23, 42, 0.12)",
        background:
          "linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(226, 232, 240, 0.88))",
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
          {isRecording ? "Recording in progress." : "Recorder is idle."}
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
      </div>

      <button
        type="button"
        aria-describedby={statusId}
        onClick={() => {
          setIsRecording((current) => !current);
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
