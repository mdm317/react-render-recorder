import type { RecorderStore } from "../store";

export interface RecorderUIOptions {
  label?: string;
  initialRecording?: boolean;
  store?: RecorderStore;
}
