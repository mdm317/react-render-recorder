import type { CompareApi, RankedProfilerSummaryResult } from "./compare-types";

// Runtime implementation is injected via `contextBridge.exposeInMainWorld("api", ...)` in `src/preload.ts`.
export const compareApi = (window as unknown as { api: CompareApi }).api;

export function getRankedProfilerSummary(): Promise<RankedProfilerSummaryResult> {
  const parity = window.__REACT_DEVTOOLS_PARITY__;
  if (!parity) {
    return Promise.resolve({
      data: null,
      error: "window.__REACT_DEVTOOLS_PARITY__ is not installed.",
    });
  }

  return parity.getRankedProfilerSummary();
}
