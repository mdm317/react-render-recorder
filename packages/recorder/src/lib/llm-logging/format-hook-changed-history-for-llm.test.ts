import { describe, expect, it } from "vitest";

import type { HookChangedHistory } from "../build-hook-changed-history";
import { formatHookChangedHistoryForLLM } from "./format-hook-changed-history-for-llm";

describe("formatHookChangedHistoryForLLM", () => {
  it("includes hook path labels when hook metadata is present", () => {
    const history: HookChangedHistory = {
      App: {
        0: [
          {
            commitIndex: 0,
            hookIndex: 0,
            hookName: "State",
            hookPath: ["useCounter(0)", "State"],
            next: 1,
            prev: 0,
          },
        ],
      },
    };

    const formatted = formatHookChangedHistoryForLLM(history);

    expect(formatted).toContain("Hook 0 (useCounter(0) > State) changed 1 time(s)");
    expect(formatted).toContain("Commit 0: 0 -> 1");
  });
});
