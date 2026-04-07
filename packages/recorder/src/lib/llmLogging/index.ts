import type { CommittedFiberChange } from "devtools-api";
import type { HookChangedHistory } from "../buildHookChangedHistory";
import { formatCommitHookChangedHistoryForLLM } from "./formatCommitHookChangedHistoryForLLM";
import { formatHookChangedHistoryForLLM } from "./formatHookChangedHistoryForLLM";

export type HookChangedHistoryLogger = (message: string) => void;

export function logHookChangedHistoryForLLM(
  hookChangedHistory: HookChangedHistory,
  logger: HookChangedHistoryLogger = (message) => {
    console.info(message);
  },
): string {
  const formattedMessage = formatHookChangedHistoryForLLM(hookChangedHistory);
  logger(formattedMessage);
  return formattedMessage;
}

export function logCommitHookChangedHistoryForLLM(
  fiberChangesByCommit: CommittedFiberChange[][],
  logger: HookChangedHistoryLogger = (message) => {
    console.info(message);
  },
): string {
  const formattedMessage = formatCommitHookChangedHistoryForLLM(fiberChangesByCommit);
  logger(formattedMessage);
  return formattedMessage;
}
