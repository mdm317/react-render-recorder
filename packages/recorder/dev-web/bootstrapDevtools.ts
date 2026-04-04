import { installReactRecordCommitLogger } from "../src/core";

export const cleanupDevtools = installReactRecordCommitLogger(window, {
  recorderUI: {
    label: "Recorder preview",
  },
});
