import type { CommittedFiberChange } from "@react-record/devtools-api";
import { buildSummaryLines } from "./util/build-summary-lines";
import { getCommitSectionLines } from "./util/format-commit-section";

function countComponentsWithHookChanges(fiberChangesByCommit: CommittedFiberChange[][]): number {
  const names = new Set<string>();
  for (const commit of fiberChangesByCommit) {
    for (const { displayName, hooks } of commit) {
      if (displayName != null && hooks != null && hooks.length > 0) {
        names.add(displayName);
      }
    }
  }
  return names.size;
}

type FormatOptions = {
  includeRenderDuration?: boolean;
  includeRerenderCount?: boolean;
};

export function formatCommitHookChangedHistoryForLLM(
  fiberChangesByCommit: CommittedFiberChange[][],
  { includeRenderDuration = false, includeRerenderCount = true }: FormatOptions = {},
): string {
  const totalCommits = fiberChangesByCommit.length;
  const componentsWithHookChanges = countComponentsWithHookChanges(fiberChangesByCommit);

  const commitsLabel = totalCommits === 1 ? "commit" : "commits";
  const componentsLabel = componentsWithHookChanges === 1 ? "component" : "components";

  const lines: string[] = [
    `${totalCommits} ${commitsLabel}, ${componentsWithHookChanges} ${componentsLabel} with hook changes`,
    ...buildSummaryLines(fiberChangesByCommit, { includeRerenderCount, includeRenderDuration }),
  ];

  fiberChangesByCommit.forEach((fiberChanges, commitIndex) => {
    lines.push("", `## Commit ${commitIndex + 1}`, ...getCommitSectionLines(fiberChanges));
  });

  return lines.join("\n");
}
