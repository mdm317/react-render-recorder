/** @jsxImportSource preact */
import {
  endRecording as endDevtoolsRecording,
  startRecording as startDevtoolsRecording,
} from "@react-record/devtools-api";
import { useCallback } from "preact/hooks";

import { createRecorderStore, useRecorderStore } from "../store";

type UseRecordingControlResult = {
  isRecording: boolean;
  toggleRecording: () => void;
};

export function useRecordingControl(): UseRecordingControlResult {
  const { state } = useRecorderStore();
  const toggleRecording = useCallback(() => {
    const store = createRecorderStore();
    if (store.getSnapshot().isRecording) {
      store.endRecording(endDevtoolsRecording());
    } else {
      startDevtoolsRecording();
      store.startRecording();
    }
  }, []);

  return {
    isRecording: state.isRecording,
    toggleRecording,
  };
}
