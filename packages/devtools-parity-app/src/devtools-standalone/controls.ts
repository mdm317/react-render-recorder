import type { BrowserWindow } from "electron";

// =============================================================================
// Standalone DevTools Profiler controls
// -----------------------------------------------------------------------------
// Two flavors of "operating the standalone Profiler":
//
//   1. Start / Stop  (target page, via CDP Runtime.evaluate)
//      JS expression strings that go through
//      `__simulateReactDevtoolsStandaloneFrontendMessage`, the hatch installed
//      by the WS tap (see `./inject-profiler-tap.ts`).
//
//   2. Read ranked summary  (home window, via webContents.executeJavaScript)
//      Calls the parity global the home renderer installed on top of
//      react-devtools-core/standalone's profilingCache.
// =============================================================================

export const PROFILER_START_EXPR = `(() => {
  window.__simulateReactDevtoolsStandaloneFrontendMessage('startProfiling', { recordChangeDescriptions: false, recordTimeline: true });
  return true;
})()`;

// Stop profiling and wait for the resulting profilingData to flow back over
// the real WebSocket so the home-window standalone DevTools' profilingCache
// can populate before this IPC resolves.
//
// Why we wait: stopProfiling triggers an async chain
//   stopProfiling → profilingStatus(false) → getProfilingData → profilingData
// over the WS. If we resolve immediately, the compare window's follow-up
// getRankedProfilerSummary() runs before the standalone frontend has populated
// its profilingCache and the ranked-summary pane stays empty even though the
// standalone Profiler eventually populates.
//
// Why we don't drive getProfilingData ourselves per renderer: ProfilerStore
// throws `Unexpected profiling data update from renderer …` for renderers
// not in its queue (see react-devtools-shared/ProfilerStore.js), which leaves
// the standalone Profiler stuck on "Processing data…".
export const PROFILER_STOP_EXPR = `(() => new Promise((resolve) => {
  if (!Array.isArray(window.__reactDevtoolsStandaloneProfilingDataWaiters)) {
    window.__reactDevtoolsStandaloneProfilingDataWaiters = [];
  }
  let settled = false;
  const finish = (reason) => {
    if (settled) return;
    settled = true;
    if (timeout != null) clearTimeout(timeout);
    const idx = window.__reactDevtoolsStandaloneProfilingDataWaiters.indexOf(arrived);
    if (idx >= 0) window.__reactDevtoolsStandaloneProfilingDataWaiters.splice(idx, 1);
    resolve({ reason: reason });
  };
  const arrived = () => finish('arrived');
  window.__reactDevtoolsStandaloneProfilingDataWaiters.push(arrived);
  const timeout = setTimeout(() => finish('timeout'), 8000);
  try {
    window.__simulateReactDevtoolsStandaloneFrontendMessage('stopProfiling');
  } catch (err) {
    finish('stop-error:' + ((err && err.message) || String(err)));
  }
}))()`;

export type DevtoolsRankedSummaryCommit = {
  rootID: number;
  rootDisplayName: string;
  commitIndex: number;
  commitDuration: number;
  components: Array<{
    name: string;
    duration: number;
  }>;
};

export type RankedProfilerSummaryResult = {
  data: DevtoolsRankedSummaryCommit[] | null;
  error: string | null;
};

// Reach into the standalone DevTools window (where react-devtools-core is
// loaded) and call the parity global installed by its renderer. Caller passes
// the window in so this module doesn't depend on the home-window factory.
export async function fetchRankedProfilerSummary(
  win: BrowserWindow | null,
): Promise<RankedProfilerSummaryResult> {
  if (!win || win.isDestroyed()) {
    return { data: null, error: "DevTools window is not open." };
  }

  try {
    const data = (await win.webContents.executeJavaScript(
      "window.__REACT_DEVTOOLS_PARITY__?.getRankedProfilerSummary?.() ?? null",
      true,
    )) as DevtoolsRankedSummaryCommit[] | null;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message || String(err) };
  }
}
