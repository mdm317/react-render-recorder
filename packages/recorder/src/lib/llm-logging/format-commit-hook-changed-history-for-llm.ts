import type { CommittedFiberChange } from "@react-record/devtools-api";
import { buildRerenderCountLines } from "./util/build-rerender-count-lines";
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

export function formatCommitHookChangedHistoryForLLM(
  fiberChangesByCommit: CommittedFiberChange[][],
): string {
  const totalCommits = fiberChangesByCommit.length;
  const componentsWithHookChanges = countComponentsWithHookChanges(fiberChangesByCommit);

  const commitsLabel = totalCommits === 1 ? "commit" : "commits";
  const componentsLabel = componentsWithHookChanges === 1 ? "component" : "components";

  const lines: string[] = [
    `${totalCommits} ${commitsLabel}, ${componentsWithHookChanges} ${componentsLabel} with hook changes`,
    ...buildRerenderCountLines(fiberChangesByCommit),
  ];

  fiberChangesByCommit.forEach((fiberChanges, commitIndex) => {
    lines.push("", `## Commit ${commitIndex + 1}`, ...getCommitSectionLines(fiberChanges));
  });

  return lines.join("\n");
}
