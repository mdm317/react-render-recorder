/** @jsxImportSource preact */
import {
  endRecording as endDevtoolsRecording,
  startRecording as startDevtoolsRecording,
} from "@react-record/devtools-api";
import { useCallback } from "preact/hooks";

import { useRecorderStore } from "../store";

type UseRecordingControlResult = {
  isRecording: boolean;
  toggleRecording: () => void;
};

export function useRecordingControl(): UseRecordingControlResult {
  const { state, store } = useRecorderStore();
  const toggleRecording = useCallback(() => {
    if (state.isRecording) {
      store.endRecording(endDevtoolsRecording());
    } else {
      if (!state.fiberRoot) {
        return;
      }
      startDevtoolsRecording(state.fiberRoot);
      store.startRecording();
    }
  }, [state.isRecording, store, state.fiberRoot]);

  return {
    // TODO: expose the idle state (fiberRoot not yet captured, before the first
    // React commit) as a separate flag so the toggle button can be disabled.
    // Right now clicking is a silent no-op with no feedback to the user.
    isRecording: state.isRecording,
    toggleRecording,
  };
}
