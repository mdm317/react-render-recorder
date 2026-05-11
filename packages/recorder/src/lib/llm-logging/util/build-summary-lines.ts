import type { CommittedFiberChange } from "@react-record/devtools-api";

import { formatDurationMsInline } from "../../../utils/format-duration";

type ComponentStats = {
  displayName: string;
  rerenders: number;
  totalDurationMs: number | null;
};

function buildComponentStats(fiberChangesByCommit: CommittedFiberChange[][]): ComponentStats[] {
  const stats: ComponentStats[] = [];
  for (const commit of fiberChangesByCommit) {
    for (const { displayName, hooks, selfDuration } of commit) {
      if (displayName == null) continue;
      if (hooks == null || hooks.length === 0) continue;
      stats.push({ displayName, rerenders: 1, totalDurationMs: selfDuration ?? null });
    }
  }
  return stats;
}

type BuildSummaryLinesOptions = {
  includeRerenderCount: boolean;
  includeRenderDuration: boolean;
};

export function buildSummaryLines(
  fiberChangesByCommit: CommittedFiberChange[][],
  { includeRerenderCount, includeRenderDuration }: BuildSummaryLinesOptions,
): string[] {
  if (!includeRerenderCount && !includeRenderDuration) return [];

  const entries = buildComponentStats(fiberChangesByCommit);
  if (entries.length === 0) return [];

  if (includeRerenderCount && includeRenderDuration) {
    // Combined view: per-component bullet list, sorted by total render time desc.
    // Format chosen via subagent A/B test — explicit labeling beats compact "A=5/60ms" inline.
    const sorted = entries.sort(
      (a, b) =>
        (b.totalDurationMs ?? -1) - (a.totalDurationMs ?? -1) ||
        a.displayName.localeCompare(b.displayName),
    );
    const lines = ["component stats (rerender count + total render time, hook changes only):"];
    for (const { displayName, rerenders, totalDurationMs } of sorted) {
      const countLabel = rerenders === 1 ? "1 rerender" : `${rerenders} rerenders`;
      lines.push(
        `- ${displayName}: ${countLabel}, ${formatDurationMsInline(totalDurationMs)} total render time`,
      );
    }
    return lines;
  }

  if (includeRerenderCount) {
    const filtered = entries.filter((s) => s.rerenders > 0);
    if (filtered.length === 0) return [];
    const sorted = filtered.sort(
      (a, b) => b.rerenders - a.rerenders || a.displayName.localeCompare(b.displayName),
    );
    return [`rerenders: ${sorted.map((s) => `${s.displayName}=${s.rerenders}`).join(", ")}`];
  }

  const filtered = entries.filter((s) => s.totalDurationMs != null);
  if (filtered.length === 0) return [];
  const sorted = filtered.sort(
    (a, b) =>
      (b.totalDurationMs ?? 0) - (a.totalDurationMs ?? 0) ||
      a.displayName.localeCompare(b.displayName),
  );
  return [
    `render time: ${sorted
      .map((s) => `${s.displayName}=${formatDurationMsInline(s.totalDurationMs)}`)
      .join(", ")}`,
  ];
}
