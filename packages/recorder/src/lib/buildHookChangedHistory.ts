import type { CommittedFiberChange, RecorderFiber } from "devtools-api";

import { sanitizeForJson } from "../logging/safeJson";

type HookChange = NonNullable<
  NonNullable<CommittedFiberChange["changeDescription"]["hooks"]>[number]
>;

export type HookHistoryEntry = HookChange & {
  commitIndex: number;
};

// key: displayName or displayName#instanceOrdinal when duplicate names exist
// value: hook changes indexed by hook index
export type HookChangedHistory = Record<string, HookIndexed>;

// key: changeDescription.hooks.hookIndex
// value: changed hook data history + commit index
export type HookIndexed = Record<number, HookHistoryEntry[]>;

export function buildHookChangedHistory(
  fiberChanges: CommittedFiberChange[][],
): HookChangedHistory {
  const historyByInstance = new Map<string, HookIndexed>();
  const instanceMetadata = new Map<
    string,
    {
      displayName: string;
      ordinal: number;
    }
  >();
  const displayNameInstanceCounts = new Map<string, number>();
  const fiberInstanceIds = new WeakMap<RecorderFiber, string>();

  function getOrCreateInstanceId(
    displayName: string,
    fiber: RecorderFiber,
    prevFiber: RecorderFiber | null,
  ): string {
    const existingInstanceId =
      fiberInstanceIds.get(fiber) ??
      (prevFiber != null ? fiberInstanceIds.get(prevFiber) : undefined);

    if (existingInstanceId != null) {
      fiberInstanceIds.set(fiber, existingInstanceId);
      if (prevFiber != null) {
        fiberInstanceIds.set(prevFiber, existingInstanceId);
      }
      return existingInstanceId;
    }

    const ordinal = (displayNameInstanceCounts.get(displayName) ?? 0) + 1;
    displayNameInstanceCounts.set(displayName, ordinal);

    const instanceId = `${displayName}::${ordinal}`;
    instanceMetadata.set(instanceId, {
      displayName,
      ordinal,
    });
    fiberInstanceIds.set(fiber, instanceId);
    if (prevFiber != null) {
      fiberInstanceIds.set(prevFiber, instanceId);
    }
    return instanceId;
  }

  fiberChanges.forEach((commitChanges, commitIndex) => {
    commitChanges.forEach(({ changeDescription, displayName, fiber, prevFiber }) => {
      if (displayName == null) {
        return;
      }

      const changedHooks = changeDescription.hooks;
      if (changedHooks == null || changedHooks.length === 0) {
        return;
      }

      const instanceId = getOrCreateInstanceId(displayName, fiber, prevFiber);
      const indexedHooks = historyByInstance.get(instanceId) ?? {};

      changedHooks.forEach((hook) => {
        const hookHistory = indexedHooks[hook.hookIndex] ?? [];

        hookHistory.push({
          ...hook,
          prev: sanitizeForJson(hook.prev),
          next: sanitizeForJson(hook.next),
          commitIndex,
        });

        indexedHooks[hook.hookIndex] = hookHistory;
      });

      historyByInstance.set(instanceId, indexedHooks);
    });
  });

  const history: HookChangedHistory = {};

  historyByInstance.forEach((indexedHooks, instanceId) => {
    const metadata = instanceMetadata.get(instanceId);
    if (metadata == null) {
      return;
    }

    const hasDuplicateNames =
      (displayNameInstanceCounts.get(metadata.displayName) ?? 0) > 1;
    const historyKey = hasDuplicateNames
      ? `${metadata.displayName}#${metadata.ordinal}`
      : metadata.displayName;

    history[historyKey] = indexedHooks;
  });

  return history;
}
