import {
  AUTO_START_QUERY_PARAMETER,
  HOOK_PATH_QUERY_PARAMETER,
  RENDER_TIME_QUERY_PARAMETER,
  SHORTCUT_QUERY_PARAMETER,
} from "../const/query-parameters";
import type { RecorderOptions } from "../types";

export function readQuery(): URLSearchParams | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location?.search ?? "");
}

export function readRecordingOption(): RecorderOptions {
  const queryParameters = readQuery();

  return {
    record: queryParameters?.get(AUTO_START_QUERY_PARAMETER) === "true",
    shortcut: queryParameters?.get(SHORTCUT_QUERY_PARAMETER) === "true",
    includeRenderDuration: queryParameters?.get(RENDER_TIME_QUERY_PARAMETER) === "true",
    includeHookPath: queryParameters?.get(HOOK_PATH_QUERY_PARAMETER) === "true",
  };
}
