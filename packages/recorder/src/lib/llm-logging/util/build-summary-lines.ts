import type { CommittedFiberChange } from "@react-record/devtools-api";

import { formatDurationMsInline } from "../../../utils/format-duration";

type ComponentStats = { rerenders: number; totalDurationMs: number | null };

type BuildSummaryLinesOptions = {
  includeRerenderCount: boolean;
  includeRenderDuration: boolean;
};

export function buildSummaryLines(
  fiberChangesByCommit: CommittedFiberChange[][],
  options: BuildSummaryLinesOptions,
): string[] {
  return [
    buildCountLine(fiberChangesByCommit),
    buildTotalsLine(fiberChangesByCommit),
    ...buildStatsLines(fiberChangesByCommit, options),
  ];
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

function buildStatsLines(
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
    const lines = ["component stats (rerender count + total render time, all renders):"];
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

function buildComponentStats(
  fiberChangesByCommit: CommittedFiberChange[][],
): Map<string, ComponentStats> {
  const stats = new Map<string, ComponentStats>();
  for (const commit of fiberChangesByCommit) {
    for (const { displayName, selfDuration } of commit) {
      if (displayName == null) continue;
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
