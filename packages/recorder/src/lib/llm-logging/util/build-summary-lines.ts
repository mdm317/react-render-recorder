import type { CommittedFiberChange } from "@react-record/devtools-api";

import { formatDurationMsInline } from "../../../utils/format-duration";

type ComponentStats = { rerenders: number; totalDurationMs: number | null };

function buildComponentStats(
  fiberChangesByCommit: CommittedFiberChange[][],
): Map<string, ComponentStats> {
  const stats = new Map<string, ComponentStats>();
  for (const commit of fiberChangesByCommit) {
    for (const { displayName, hooks, selfDuration } of commit) {
      if (displayName == null) continue;
      if (hooks == null || hooks.length === 0) continue;
      const existing = stats.get(displayName) ?? { rerenders: 0, totalDurationMs: null };
      existing.rerenders += 1;
      if (selfDuration != null) {
        existing.totalDurationMs = (existing.totalDurationMs ?? 0) + selfDuration;
      }
      stats.set(displayName, existing);
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

  const stats = buildComponentStats(fiberChangesByCommit);
  if (stats.size === 0) return [];

  const entries = [...stats];

  if (includeRerenderCount && includeRenderDuration) {
    // Combined view: per-component bullet list, sorted by total render time desc.
    // Format chosen via subagent A/B test — explicit labeling beats compact "A=5/60ms" inline.
    const sorted = entries.sort(
      ([aName, a], [bName, b]) =>
        (b.totalDurationMs ?? -1) - (a.totalDurationMs ?? -1) || aName.localeCompare(bName),
    );
    const lines = ["component stats (rerender count + total render time, hook changes only):"];
    for (const [name, { rerenders, totalDurationMs }] of sorted) {
      const countLabel = rerenders === 1 ? "1 rerender" : `${rerenders} rerenders`;
      lines.push(
        `- ${name}: ${countLabel}, ${formatDurationMsInline(totalDurationMs)} total render time`,
      );
    }
    return lines;
  }

  if (includeRerenderCount) {
    const filtered = entries.filter(([, s]) => s.rerenders > 0);
    if (filtered.length === 0) return [];
    const sorted = filtered.sort(
      ([aName, a], [bName, b]) => b.rerenders - a.rerenders || aName.localeCompare(bName),
    );
    return [`rerenders: ${sorted.map(([name, s]) => `${name}=${s.rerenders}`).join(", ")}`];
  }

  const filtered = entries.filter(([, s]) => s.totalDurationMs != null);
  if (filtered.length === 0) return [];
  const sorted = filtered.sort(
    ([aName, a], [bName, b]) =>
      (b.totalDurationMs ?? 0) - (a.totalDurationMs ?? 0) || aName.localeCompare(bName),
  );
  return [
    `render time: ${sorted
      .map(([name, s]) => `${name}=${formatDurationMsInline(s.totalDurationMs)}`)
      .join(", ")}`,
  ];
}
