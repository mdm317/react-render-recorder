import type { CommittedFiberChange } from "@react-record/devtools-api";

import type { HookChangedHistory } from "./build-hook-changed-history";

function normalizeComponentName(value: string): string {
  return value.trim().toLowerCase();
}

function getBaseComponentName(value: string): string {
  return value.replace(/#\d+$/, "");
}

function matchesComponentQuery(componentName: string, query: string): boolean {
  const normalizedQuery = normalizeComponentName(query);
  if (normalizedQuery.length === 0) {
    return true;
  }

  const candidateNames = [componentName, getBaseComponentName(componentName)];

  return candidateNames.some((candidateName) => {
    const normalizedCandidate = normalizeComponentName(candidateName);
    return normalizedCandidate === normalizedQuery || normalizedCandidate.includes(normalizedQuery);
  });
}

export function getComponentNamesFromHistory(hookChangedHistory: HookChangedHistory): string[] {
  return Object.keys(hookChangedHistory).sort((left, right) => left.localeCompare(right));
}

export function getMatchingComponentNames(
  hookChangedHistory: HookChangedHistory,
  query: string,
): string[] {
  return getComponentNamesFromHistory(hookChangedHistory).filter((componentName) =>
    matchesComponentQuery(componentName, query),
  );
}

export function filterHookChangedHistoryByComponent(
  hookChangedHistory: HookChangedHistory,
  query: string,
): HookChangedHistory {
  if (normalizeComponentName(query).length === 0) {
    return hookChangedHistory;
  }

  return Object.fromEntries(
    Object.entries(hookChangedHistory).filter(([componentName]) =>
      matchesComponentQuery(componentName, query),
    ),
  );
}

export function filterFiberChangesByComponent(
  fiberChangesByCommit: CommittedFiberChange[][],
  query: string,
): CommittedFiberChange[][] {
  if (normalizeComponentName(query).length === 0) {
    return fiberChangesByCommit;
  }

  return filterFiberChangesByComponentPreservingCommitIndices(fiberChangesByCommit, query).filter(
    (commitChanges) => commitChanges.length > 0,
  );
}

export function filterFiberChangesByComponentPreservingCommitIndices(
  fiberChangesByCommit: CommittedFiberChange[][],
  query: string,
): CommittedFiberChange[][] {
  if (normalizeComponentName(query).length === 0) {
    return fiberChangesByCommit;
  }

  return fiberChangesByCommit.map((commitChanges) =>
    commitChanges.filter(
      ({ displayName }) => displayName != null && matchesComponentQuery(displayName, query),
    ),
  );
}
