import { describe, expect, it } from "vitest";

import { formatCommitHookChangedHistoryForLLM } from "./format-commit-hook-changed-history-for-llm";

describe("formatCommitHookChangedHistoryForLLM", () => {
  it("formats commit numbers as one-based labels", () => {
    const formatted = formatCommitHookChangedHistoryForLLM([
      [],
      [
        {
          changeDescription: {
            hooks: [
              {
                hookIndex: 0,
                hookName: "State",
                next: 1,
                prev: 0,
              },
            ],
          },
          displayName: "App",
        } as never,
      ],
    ]);

    expect(formatted).toContain("- Commit numbers are one-based.");
    expect(formatted).toContain("Commit 2");
  });

  it("returns only the summary when there are no hook changes", () => {
    const formatted = formatCommitHookChangedHistoryForLLM([]);

    expect(formatted).toContain("Commit-oriented hook change history summary");
    expect(formatted).toContain("- Commits with hook changes: 0");
    expect(formatted).toContain("- Components with hook changes: 0");
    expect(formatted).toContain("- Total hook change events: 0");
    expect(formatted).not.toContain("No hook changes were recorded.");
  });
});
