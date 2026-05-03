import { clipboard, contextBridge, ipcRenderer, shell } from "electron";
import * as fs from "fs";

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

type EnvOptions = {
  options: { key: Buffer; cert: Buffer } | undefined;
  useHttps: boolean;
  host: string;
  protocol: "http" | "https";
  port: number;
  path: string | undefined;
  clientHost: string | undefined;
  clientPort: number | undefined;
  clientUseHttps: boolean | undefined;
};

contextBridge.exposeInMainWorld("api", {
  electron: { clipboard, shell },

  getDevTools() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("react-devtools-core/standalone").default;
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(
        (err as Error).toString() +
          "\n\nDid you install dependencies in packages/devtools-parity-app?",
      );
      return null;
    }
  },

  readEnv(): EnvOptions {
    let options: EnvOptions["options"];
    let useHttps = false;
    try {
      if (process.env.KEY && process.env.CERT) {
        options = {
          key: fs.readFileSync(process.env.KEY),
          cert: fs.readFileSync(process.env.CERT),
        };
        useHttps = true;
      }
    } catch (err) {
      console.error("Failed to process SSL options - ", err);
      options = undefined;
    }

    const host = process.env.HOST || "localhost";
    const protocol: "http" | "https" = useHttps ? "https" : "http";
    const port = Number(process.env.REACT_DEVTOOLS_PORT) || Number(process.env.PORT) || 8097;
    const path = process.env.REACT_DEVTOOLS_PATH || undefined;
    const clientHost = process.env.REACT_DEVTOOLS_CLIENT_HOST || undefined;
    const clientPort = process.env.REACT_DEVTOOLS_CLIENT_PORT
      ? Number(process.env.REACT_DEVTOOLS_CLIENT_PORT)
      : undefined;
    const clientUseHttps =
      process.env.REACT_DEVTOOLS_CLIENT_USE_HTTPS === "true" ? true : undefined;

    return {
      options,
      useHttps,
      host,
      protocol,
      port,
      path,
      clientHost,
      clientPort,
      clientUseHttps,
    };
  },

  openTarget(url: string, host: string, port: number): Promise<void> {
    return ipcRenderer.invoke(OPEN_TARGET, {
      url,
      host,
      port,
    });
  },

  closeTarget(): Promise<void> {
    return ipcRenderer.invoke(CLOSE_TARGET);
  },

  openCompare(): Promise<void> {
    return ipcRenderer.invoke(OPEN_COMPARE);
  },

  fetchRecorderFiberChanges(): Promise<unknown> {
    return ipcRenderer.invoke(FETCH_FIBER_CHANGES);
  },

  fetchRankedProfilerSummary(): Promise<unknown> {
    return ipcRenderer.invoke(FETCH_RANKED_PROFILER_SUMMARY);
  },

  recorderStart(): Promise<{ ok: boolean; error: string | null }> {
    return ipcRenderer.invoke(RECORDER_START);
  },

  recorderEnd(): Promise<{ ok: boolean; error: string | null }> {
    return ipcRenderer.invoke(RECORDER_END);
  },

  profilerStart(): Promise<{ ok: boolean; error: string | null }> {
    return ipcRenderer.invoke(PROFILER_START);
  },

  profilerStop(): Promise<{ ok: boolean; error: string | null }> {
    return ipcRenderer.invoke(PROFILER_STOP);
  },
});
