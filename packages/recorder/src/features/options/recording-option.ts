export type CommitHistoryFormatOptions = {
  includeRenderDuration: boolean;
  includeHookPath: boolean;
  includeSource: boolean;
};

export const DEFAULT_COMMIT_HISTORY_FORMAT_OPTIONS: CommitHistoryFormatOptions = {
  includeRenderDuration: false,
  includeHookPath: false,
  includeSource: false,
};

export type RecorderOptions = CommitHistoryFormatOptions & {
  record: boolean;
  shortcut: boolean;
};

const AUTO_START_QUERY_PARAMETER = "record";
const SHORTCUT_QUERY_PARAMETER = "shortcut";
const RENDER_TIME_QUERY_PARAMETER = "renderTime";
const HOOK_PATH_QUERY_PARAMETER = "hookPath";
const SOURCE_QUERY_PARAMETER = "source";

function readQuery(): URLSearchParams | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location?.search ?? "");
}

export function readRecordingOption(): RecorderOptions {
  const queryParameters = readQuery();

  return {
    record: queryParameters?.get(AUTO_START_QUERY_PARAMETER) === "true",
    shortcut: queryParameters?.get(SHORTCUT_QUERY_PARAMETER) === "true",
    includeRenderDuration: queryParameters?.get(RENDER_TIME_QUERY_PARAMETER) === "true",
    includeSource: queryParameters?.get(SOURCE_QUERY_PARAMETER) === "true",
    includeHookPath: queryParameters?.get(HOOK_PATH_QUERY_PARAMETER) === "true",
  };
}
