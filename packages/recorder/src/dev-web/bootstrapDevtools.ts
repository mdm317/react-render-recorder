import { installReactRecordCommitLogger } from "../core";

export const cleanupDevtools = installReactRecordCommitLogger(window, {
  recorderUI: {
    label: "Recorder preview",
  },
});
