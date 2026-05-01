import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./index.css";

type DevtoolsRankedSummaryCommit = {
  rootID: number;
  rootDisplayName: string;
  commitIndex: number;
  commitDuration: number;
  components: Array<{
    name: string;
    duration: number;
  }>;
};

type RankedProfilerSummaryResult = {
  data: DevtoolsRankedSummaryCommit[] | null;
  error: string | null;
};

type CompareApi = {
  fetchRankedProfilerSummary: () => Promise<RankedProfilerSummaryResult>;
};

declare global {
  interface Window {
    __REACT_DEVTOOLS_PARITY__?: {
      getRankedProfilerSummary: () => Promise<RankedProfilerSummaryResult>;
    };
  }
}

const compareApi = (window as unknown as { api: CompareApi }).api;

window.__REACT_DEVTOOLS_PARITY__ = {
  getRankedProfilerSummary: () => compareApi.fetchRankedProfilerSummary(),
};

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("#root not found in compare window");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
