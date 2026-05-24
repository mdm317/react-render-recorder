import type { CommittedFiberChange } from "@react-record/devtools-api";

import { formatDurationMsInline } from "../../../utils/format-duration";

export function buildSummaryLines(fiberChangesByCommit: CommittedFiberChange[][]): string[] {
  return [buildCountLine(fiberChangesByCommit), buildTotalsLine(fiberChangesByCommit)];
}

function buildCountLine(fiberChangesByCommit: CommittedFiberChange[][]): string {
  const totalCommits = fiberChangesByCommit.length;
  const names = new Set<string>();
  for (const commit of fiberChangesByCommit) {
    for (const { displayName, hooks } of commit) {
      if (displayName != null && hooks != null && hooks.length > 0) {
        names.add(displayName);
      }
    }
  }
  const componentsWithHookChanges = names.size;
  const commitsLabel = totalCommits === 1 ? "commit" : "commits";
  const componentsLabel = componentsWithHookChanges === 1 ? "component" : "components";
  return `${totalCommits} ${commitsLabel}, ${componentsWithHookChanges} ${componentsLabel} with hook changes`;
}

function buildTotalsLine(fiberChangesByCommit: CommittedFiberChange[][]): string {
  let totalRerenders = 0;
  let totalDurationMs: number | null = null;
  for (const commit of fiberChangesByCommit) {
    for (const { displayName, selfDuration } of commit) {
      if (displayName == null) continue;
      totalRerenders += 1;
      if (selfDuration != null) {
        totalDurationMs = (totalDurationMs ?? 0) + selfDuration;
      }
    }
  }
  const rerendersLabel = totalRerenders === 1 ? "rerender" : "rerenders";
  return `${totalRerenders} total ${rerendersLabel}, ${formatDurationMsInline(totalDurationMs)} total render time`;
}
