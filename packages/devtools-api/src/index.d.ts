export interface RecorderDevtoolsSnapshot {
    channel: "devtools-api";
    label: string;
    state: "idle" | "recording";
    badge: string;
}
export interface RecorderDevtoolsOptions {
    label: string;
    isRecording: boolean;
}
export declare function createRecorderDevtoolsSnapshot({ label, isRecording, }: RecorderDevtoolsOptions): RecorderDevtoolsSnapshot;
