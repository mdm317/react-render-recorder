/** @jsxImportSource preact */
import { useCallback } from "preact/hooks";

import { endRecording, startRecording } from "../services/recording";
import { useRecorderStore } from "../store";

type UseRecordingControlResult = {
  isRecording: boolean;
  toggleRecording: () => void;
};

export function useRecordingControl(): UseRecordingControlResult {
  const { state, store } = useRecorderStore();
  const toggleRecording = useCallback(() => {
    if (state.isRecording) {
      endRecording(store);
    } else {
      startRecording(store);
    }
  }, [state.isRecording, store]);

  return {
    // TODO: expose the idle state (fiberRoots not yet captured, before the first
    // React commit) as a separate flag so the toggle button can be disabled.
    // Right now clicking is a silent no-op with no feedback to the user.
    isRecording: state.isRecording,
    toggleRecording,
  };
}
