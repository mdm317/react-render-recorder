export type CommitHistoryFormatOptions = {
  includeRenderDuration: boolean;
  includeHookPath: boolean;
  includeSource?: boolean;
};

export type RecorderOptions = CommitHistoryFormatOptions & {
  record: boolean;
  shortcut: boolean;
};
