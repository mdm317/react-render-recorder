export type CommitHistoryFormatOptions = {
  includeRenderDuration: boolean;
  includeHookPath: boolean;
};

export type RecorderOptions = CommitHistoryFormatOptions & {
  record: boolean;
  shortcut: boolean;
};
