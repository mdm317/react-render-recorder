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
