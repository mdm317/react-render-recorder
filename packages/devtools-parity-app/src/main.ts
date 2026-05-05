import { app, ipcMain } from "electron";

import {
  fetchRankedProfilerSummary,
  PROFILER_START_EXPR,
  PROFILER_STOP_EXPR,
} from "./devtools-standalone/controls";
import {
  CLOSE_TARGET,
  FETCH_FIBER_CHANGES,
  FETCH_RANKED_PROFILER_SUMMARY,
  OPEN_COMPARE,
  OPEN_TARGET,
  PROFILER_START,
  PROFILER_STOP,
  RECORDER_END,
  RECORDER_START,
} from "./ipc-channels";
import {
  fetchFiberChangesFromTarget,
  RECORDER_END_EXPR,
  RECORDER_START_EXPR,
} from "./recorder/controls";
import { startReactRenderRecordServer } from "./recorder/server";
import { createComparisonWindow } from "./windows/compare";
import { createDevtoolsWindow, getDevtoolsWindow } from "./windows/home";
import { clearTargetWindow, evalOnTarget, getTargetWindow, openTargetUrl } from "./windows/target";

function closeTargetUrl() {
  const win = getTargetWindow();
  if (win && !win.isDestroyed()) {
    win.close();
  }
  clearTargetWindow();
}

app.on("window-all-closed", () => {
  app.quit();
});

app.on("ready", async () => {
  await startReactRenderRecordServer();

  ipcMain.handle(
    OPEN_TARGET,
    async (_evt, payload: { url: string; host: string; port: number }): Promise<void> => {
      await openTargetUrl(payload.url, payload.host, payload.port);
      createComparisonWindow();
    },
  );

  ipcMain.handle(CLOSE_TARGET, () => {
    closeTargetUrl();
  });

  ipcMain.handle(OPEN_COMPARE, () => {
    createComparisonWindow();
  });

  ipcMain.handle(FETCH_FIBER_CHANGES, () => fetchFiberChangesFromTarget());

  ipcMain.handle(FETCH_RANKED_PROFILER_SUMMARY, () =>
    fetchRankedProfilerSummary(getDevtoolsWindow()),
  );

  ipcMain.handle(RECORDER_START, () => evalOnTarget(RECORDER_START_EXPR));
  ipcMain.handle(RECORDER_END, () => evalOnTarget(RECORDER_END_EXPR));
  ipcMain.handle(PROFILER_START, () => evalOnTarget(PROFILER_START_EXPR));
  ipcMain.handle(PROFILER_STOP, () => evalOnTarget(PROFILER_STOP_EXPR, { awaitPromise: true }));

  createDevtoolsWindow();
});
