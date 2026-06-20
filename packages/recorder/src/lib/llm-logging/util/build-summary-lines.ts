import type { CommittedFiberChange } from "@react-record/devtools-api";

import { formatDurationMsInline } from "../../../utils/format-duration";

export function buildSummaryLines(fiberChangesByCommit: CommittedFiberChange[][]): string[] {
  return [buildCountLine(fiberChangesByCommit), buildRenderTimeLine(fiberChangesByCommit)];
}

function buildCountLine(fiberChangesByCommit: CommittedFiberChange[][]): string {
  const totalCommits = fiberChangesByCommit.length;
  let rerenderedComponents = 0;
  for (const commit of fiberChangesByCommit) {
    for (const { hooks } of commit) {
      if (hooks != null) {
        rerenderedComponents += 1;
      }
    }
  }
  return `${totalCommits} commits, ${rerenderedComponents} components rerendered`;
}

function buildRenderTimeLine(fiberChangesByCommit: CommittedFiberChange[][]): string {
  let totalDurationMs: number | null = null;
  for (const commit of fiberChangesByCommit) {
    for (const { selfDuration } of commit) {
      if (selfDuration != null) {
        totalDurationMs = (totalDurationMs ?? 0) + selfDuration;
      }
    }
  }
  return `${formatDurationMsInline(totalDurationMs)} total render time`;
}
