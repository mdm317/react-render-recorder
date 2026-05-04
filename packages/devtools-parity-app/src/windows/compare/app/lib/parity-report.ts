import { buildCommitPairs } from "./build-commit-pairs";
import type { CommitPair } from "./build-commit-pairs";
import type {
  CompareStatus,
  FiberChangesResult,
  RankedProfilerSummaryResult,
} from "./compare-types";

export type ParityReport = {
  commitPairs: CommitPair[];
  matchedCount: number;
  mismatchedCount: number;
};

export const EMPTY_PARITY_REPORT: ParityReport = {
  commitPairs: [],
  matchedCount: 0,
  mismatchedCount: 0,
};

export function describeFiberChanges(fiberChanges: FiberChangesResult["fiberChanges"]): string {
  if (fiberChanges == null) return "no fiberChanges captured yet.";

  const totalChanges = fiberChanges.reduce((sum, commit) => sum + commit.length, 0);
  return `${fiberChanges.length} commits, ${totalChanges} total fiber changes.`;
}

export function describeRankedSummary(commits: RankedProfilerSummaryResult["data"]): string {
  if (commits == null || commits.length === 0) return "no ranked summary available yet.";

  const totalComponents = commits.reduce((sum, commit) => sum + commit.components.length, 0);
  return `${commits.length} commit(s), ${totalComponents} ranked component entries.`;
}

export function getStatusText(status: CompareStatus): string {
  if (status === "startingRecording") {
    return "Starting recording…";
  }

  if (status === "recording") {
    return "Recording — click Stop to finish.";
  }

  if (status === "stoppingRecording") {
    return "Stopping recording…";
  }

  if (status === "fetching") {
    return "Fetching from target page…";
  }

  return "Ready.";
}

export function getParityReport(
  recorderFiberChanges: FiberChangesResult,
  profilerRankedSummary: RankedProfilerSummaryResult,
): ParityReport {
  const commitPairs = buildCommitPairs(
    recorderFiberChanges.fiberChanges ?? [],
    profilerRankedSummary.data ?? [],
  );

  let matchedCount = 0;
  for (const pair of commitPairs) {
    if (pair.status === "matched") {
      matchedCount += 1;
    }
  }

  return {
    commitPairs,
    matchedCount,
    mismatchedCount: commitPairs.length - matchedCount,
  };
}
