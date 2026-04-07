import type { HookChangedHistory } from "../store/recorderStore";
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
  hookChangedHistory: HookChangedHistory,
  logger: HookChangedHistoryLogger = (message) => {
    console.info(message);
  },
): string {
  const formattedMessage = formatCommitHookChangedHistoryForLLM(hookChangedHistory);
  logger(formattedMessage);
  return formattedMessage;
}
