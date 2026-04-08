import "./index.css";
import "./installRecorder";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { createRecorderStore } from "../src/store";

declare global {
  interface Window {
    __REACT_RECORD_TEST__?: {
      getSnapshot: () => {
        commitCount: number;
        fiberChangeCount: number;
        hookChangedHistory: ReturnType<
          ReturnType<typeof createRecorderStore>["getSnapshot"]
        >["hookChangedHistory"];
        isRecording: boolean;
      };
    };
  }
}

if (import.meta.env.DEV) {
  const recorderStore = createRecorderStore();
  window.__REACT_RECORD_TEST__ = {
    getSnapshot: () => {
      const snapshot = recorderStore.getSnapshot();
      return {
        isRecording: snapshot.isRecording,
        commitCount: snapshot.commits.length,
        fiberChangeCount: snapshot.fiberChanges.length,
        hookChangedHistory: snapshot.hookChangedHistory,
      };
    },
  };
}

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container #root was not found.");
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount();
  });
}
