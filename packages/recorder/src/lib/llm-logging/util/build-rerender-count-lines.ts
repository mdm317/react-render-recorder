import type { CommittedFiberChange } from "@react-record/devtools-api";

export function buildRerenderCountLines(
  input: CommittedFiberChange[] | CommittedFiberChange[][],
): string[] {
  const fiberChangesByCommit = (
    Array.isArray(input[0]) ? input : [input]
  ) as CommittedFiberChange[][];

  const counts = new Map<string, number>();
  for (const commit of fiberChangesByCommit) {
    for (const { displayName, isFirstMount } of commit) {
      if (displayName == null || isFirstMount) continue;
      counts.set(displayName, (counts.get(displayName) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return [];

  const sorted = [...counts].sort(
    ([aName, aCount], [bName, bCount]) => bCount - aCount || aName.localeCompare(bName),
  );

  return [`rerenders: ${sorted.map(([name, count]) => `${name}=${count}`).join(", ")}`];
}
