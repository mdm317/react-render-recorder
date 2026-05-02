import type { CommittedFiberChange } from "@react-record/devtools-api";

export type SerializableFiberChange = Omit<CommittedFiberChange, "fiber" | "prevFiber">;

export type DevtoolsRankedSummaryCommit = {
  rootID: number;
  rootDisplayName: string;
  commitIndex: number;
  commitDuration: number;
  components: Array<{ name: string; duration: number }>;
};

export type ComponentEntry = {
  displayName: string;
  selfDuration: number;
};

export type CommitPair = {
  commitIndex: number;
  status: "matched" | "mismatched";
  recorderTotal: number;
  devtoolsTotal: number;
  matched: ComponentEntry[];
  recorderOnly: ComponentEntry[];
  devtoolsOnly: ComponentEntry[];
  recorderSkipped: SerializableFiberChange[];
  devtoolsSkipped: ComponentEntry[];
};

const KEY_DELIM = "␞";

// Recorder uses `getComponentNameFromType` which wraps ForwardRef/Memo as
// `ForwardRef(X)` / `Memo(X)`, while stock devtools' ranked summary often
// returns the unwrapped inner name. Strip these for comparison.
const WRAPPER_PATTERN = /^(?:ForwardRef|Memo)\((.+)\)$/;

export function normalizeDisplayName(name: string): string {
  let result = name;
  while (true) {
    const m = WRAPPER_PATTERN.exec(result);
    if (!m) return result;
    result = m[1];
  }
}

// Round to 3 decimal places — matches the display precision (`.toFixed(3)`)
// and absorbs sub-µs differences between recorder/devtools selfDuration paths.
export function normalizeDuration(d: number): number {
  return Math.round(d * 1000) / 1000;
}

// Recorder's collectFiberChanges only tracks Class / Function / ForwardRef /
// Memo components — every other fiber tag (ContextProvider, ContextConsumer,
// Suspense, Fragment, HostComponent, …) returns null from getChangeDescription
// and is dropped. Stock devtools' ranked summary has no such filter, so we
// drop the same kinds on the devtools side to keep multisets comparable.
const DEVTOOLS_ONLY_NAME_PATTERNS = [/\.Provider$/, /\.Consumer$/];

export function isDevtoolsOnlyKind(name: string): boolean {
  return DEVTOOLS_ONLY_NAME_PATTERNS.some((re) => re.test(name));
}

function entryKey(name: string, dur: number): string {
  return `${normalizeDisplayName(name)}${KEY_DELIM}${normalizeDuration(dur)}`;
}

export function buildCommitPairs(
  recorderCommits: SerializableFiberChange[][] | null,
  devtoolsCommits: DevtoolsRankedSummaryCommit[] | null,
): CommitPair[] {
  const devtoolsByCommit = filterFirstRoot(devtoolsCommits);
  const recorderByCommit = recorderCommits ?? [];
  const maxLen = Math.max(recorderByCommit.length, devtoolsByCommit.length);

  const pairs: CommitPair[] = [];
  for (let i = 0; i < maxLen; i++) {
    pairs.push(buildPair(i, recorderByCommit[i] ?? null, devtoolsByCommit[i] ?? null));
  }
  return pairs;
}

function filterFirstRoot(
  commits: DevtoolsRankedSummaryCommit[] | null,
): DevtoolsRankedSummaryCommit[] {
  if (commits == null || commits.length === 0) return [];
  const firstRoot = commits[0].rootID;
  return commits
    .filter((c) => c.rootID === firstRoot)
    .slice()
    .sort((a, b) => a.commitIndex - b.commitIndex);
}

function buildPair(
  commitIndex: number,
  recorderCommit: SerializableFiberChange[] | null,
  devtoolsCommit: DevtoolsRankedSummaryCommit | null,
): CommitPair {
  const { kept: recorderKept, skipped } =
    recorderCommit != null
      ? splitRecorderEntries(recorderCommit)
      : { kept: [], skipped: [] };

  const devtoolsEntries: ComponentEntry[] = [];
  const devtoolsSkipped: ComponentEntry[] = [];
  for (const c of devtoolsCommit?.components ?? []) {
    const entry: ComponentEntry = { displayName: c.name, selfDuration: c.duration };
    if (isDevtoolsOnlyKind(c.name)) {
      devtoolsSkipped.push(entry);
    } else {
      devtoolsEntries.push(entry);
    }
  }

  type Slot = {
    normalized: ComponentEntry;
    recorderEntries: ComponentEntry[];
    devtoolsEntries: ComponentEntry[];
  };
  const slots = new Map<string, Slot>();

  function getSlot(e: ComponentEntry): Slot {
    const k = entryKey(e.displayName, e.selfDuration);
    let slot = slots.get(k);
    if (slot == null) {
      slot = {
        normalized: {
          displayName: normalizeDisplayName(e.displayName),
          selfDuration: normalizeDuration(e.selfDuration),
        },
        recorderEntries: [],
        devtoolsEntries: [],
      };
      slots.set(k, slot);
    }
    return slot;
  }

  for (const e of recorderKept) getSlot(e).recorderEntries.push(e);
  for (const e of devtoolsEntries) getSlot(e).devtoolsEntries.push(e);

  const matched: ComponentEntry[] = [];
  const recorderOnly: ComponentEntry[] = [];
  const devtoolsOnly: ComponentEntry[] = [];
  for (const { normalized, recorderEntries, devtoolsEntries } of slots.values()) {
    const matchedCount = Math.min(recorderEntries.length, devtoolsEntries.length);
    for (let i = 0; i < matchedCount; i++) matched.push(normalized);
    for (let i = matchedCount; i < recorderEntries.length; i++) {
      recorderOnly.push(recorderEntries[i]);
    }
    for (let i = matchedCount; i < devtoolsEntries.length; i++) {
      devtoolsOnly.push(devtoolsEntries[i]);
    }
  }

  const status: CommitPair["status"] =
    recorderOnly.length === 0 && devtoolsOnly.length === 0 ? "matched" : "mismatched";

  return {
    commitIndex,
    status,
    recorderTotal: recorderCommit?.length ?? 0,
    devtoolsTotal: devtoolsCommit?.components.length ?? 0,
    matched,
    recorderOnly,
    devtoolsOnly,
    recorderSkipped: skipped,
    devtoolsSkipped,
  };
}

function splitRecorderEntries(commit: SerializableFiberChange[]): {
  kept: ComponentEntry[];
  skipped: SerializableFiberChange[];
} {
  const kept: ComponentEntry[] = [];
  const skipped: SerializableFiberChange[] = [];
  for (const e of commit) {
    if (e.displayName != null && e.selfDuration != null) {
      kept.push({ displayName: e.displayName, selfDuration: e.selfDuration });
    } else {
      skipped.push(e);
    }
  }
  return { kept, skipped };
}
