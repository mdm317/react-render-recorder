import "./index.css";
import "./install-recorder";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
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
      rerenderApp: () => void;
    };
  }
}

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container #root was not found.");
}

const root = createRoot(container);
const recorderStore = createRecorderStore();
let renderTick = 0;

function renderApp() {
  root.render(
    <StrictMode>
      <App renderTick={renderTick} />
    </StrictMode>,
  );
}

if (import.meta.env.DEV) {
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
    rerenderApp: () => {
      renderTick += 1;
      renderApp();
    },
  };
}

renderApp();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount();
  });
}
