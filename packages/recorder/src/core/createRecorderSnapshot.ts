export interface RecorderSnapshot {
  channel: "devtools-api";
  label: string;
  state: "idle" | "recording";
  badge: string;
}

export interface RecorderSnapshotOptions {
  label: string;
  isRecording: boolean;
}

export function createRecorderSnapshot({
  label,
  isRecording,
}: RecorderSnapshotOptions): RecorderSnapshot {
  return {
    channel: "devtools-api",
    label,
    state: isRecording ? "recording" : "idle",
    badge: isRecording ? "LIVE" : "READY",
  };
}
