export type CommitHistoryFormatOptions = {
  includeRenderDuration: boolean;
  includeHookPath: boolean;
};

export type RecorderOptions = CommitHistoryFormatOptions & {
  shortcut: boolean;
};
