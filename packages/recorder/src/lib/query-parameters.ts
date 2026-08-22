import {
  HOOK_PATH_QUERY_PARAMETER,
  RENDER_TIME_QUERY_PARAMETER,
  SHORTCUT_QUERY_PARAMETER,
} from "../const/query-parameters";
import type { RecorderOptions } from "../types";

export function readQuery(): URLSearchParams | null {
  if (import.meta.env.DEV) {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location?.search ?? "");
  }

  if (typeof document === "undefined") return null;
  const selfScript = document.currentScript as HTMLScriptElement | null;
  return selfScript?.src ? new URL(selfScript.src).searchParams : null;
}

export function readRecordingOption(): RecorderOptions {
  const queryParameters = readQuery();

  return {
    shortcut: queryParameters?.get(SHORTCUT_QUERY_PARAMETER) === "true",
    includeRenderDuration: queryParameters?.get(RENDER_TIME_QUERY_PARAMETER) === "true",
    includeHookPath: queryParameters?.get(HOOK_PATH_QUERY_PARAMETER) === "true",
  };
}
