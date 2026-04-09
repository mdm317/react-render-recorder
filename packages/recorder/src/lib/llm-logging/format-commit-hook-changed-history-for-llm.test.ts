import { describe, expect, it } from "vitest";

import { formatCommitHookChangedHistoryForLLM } from "./format-commit-hook-changed-history-for-llm";

describe("formatCommitHookChangedHistoryForLLM", () => {
  it("returns only the summary when there are no hook changes", () => {
    const formatted = formatCommitHookChangedHistoryForLLM([]);

    expect(formatted).toContain("Commit-oriented hook change history summary");
    expect(formatted).toContain("- Commits with hook changes: 0");
    expect(formatted).toContain("- Components with hook changes: 0");
    expect(formatted).toContain("- Total hook change events: 0");
    expect(formatted).not.toContain("No hook changes were recorded.");
  });
});
