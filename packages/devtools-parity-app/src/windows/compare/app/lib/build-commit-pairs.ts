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

type ComponentComparison = Pick<CommitPair, "matched" | "recorderOnly" | "devtoolsOnly">;

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

function normalizeEntry(entry: ComponentEntry): ComponentEntry {
  return {
    displayName: normalizeDisplayName(entry.displayName),
    selfDuration: normalizeDuration(entry.selfDuration),
  };
}

function entryKey(entry: ComponentEntry): string {
  return `${entry.displayName}${KEY_DELIM}${entry.selfDuration}`;
}

export function buildCommitPairs(
  recorderCommits: SerializableFiberChange[][],
  devtoolsCommits: DevtoolsRankedSummaryCommit[],
): CommitPair[] {
  const devtoolsByCommit = filterFirstRoot(devtoolsCommits);
  const maxLen = Math.max(recorderCommits.length, devtoolsByCommit.length);

  const pairs: CommitPair[] = [];
  for (let i = 0; i < maxLen; i++) {
    pairs.push(buildPair(i, recorderCommits[i] ?? [], devtoolsByCommit[i]?.components ?? []));
  }
  return pairs;
}

function filterFirstRoot(commits: DevtoolsRankedSummaryCommit[]): DevtoolsRankedSummaryCommit[] {
  if (commits.length === 0) return [];
  const firstRoot = commits[0].rootID;
  return commits.filter((c) => c.rootID === firstRoot);
}

function buildPair(
  commitIndex: number,
  recorderCommit: SerializableFiberChange[],
  devtoolsComponents: DevtoolsRankedSummaryCommit["components"],
): CommitPair {
  const { comparable: recorderComparable, skipped: recorderSkipped } =
    splitRecorderEntries(recorderCommit);
  const { comparable: devtoolsComparable, skipped: devtoolsSkipped } =
    splitDevtoolsEntries(devtoolsComponents);
  const { matched, recorderOnly, devtoolsOnly } = compareComponentEntries(
    recorderComparable,
    devtoolsComparable,
  );

  const status: CommitPair["status"] =
    recorderOnly.length === 0 && devtoolsOnly.length === 0 ? "matched" : "mismatched";

  return {
    commitIndex,
    status,
    recorderTotal: recorderCommit.length,
    devtoolsTotal: devtoolsComponents.length,
    matched,
    recorderOnly,
    devtoolsOnly,
    recorderSkipped,
    devtoolsSkipped,
  };
}

function compareComponentEntries(
  recorderEntries: ComponentEntry[],
  devtoolsEntries: ComponentEntry[],
): ComponentComparison {
  const devtoolsByEntryKey = new Map<string, ComponentEntry[]>();
  for (const devtoolsEntry of devtoolsEntries) {
    const key = entryKey(normalizeEntry(devtoolsEntry));
    const candidates = devtoolsByEntryKey.get(key) ?? [];
    candidates.push(devtoolsEntry);
    devtoolsByEntryKey.set(key, candidates);
  }

  const matched: ComponentEntry[] = [];
  const recorderOnly: ComponentEntry[] = [];

  for (const recorderEntry of recorderEntries) {
    const normalizedRecorderEntry = normalizeEntry(recorderEntry);
    const key = entryKey(normalizedRecorderEntry);
    const matchingDevtoolsCandidates = devtoolsByEntryKey.get(key);

    if (matchingDevtoolsCandidates == null || matchingDevtoolsCandidates.length === 0) {
      recorderOnly.push(recorderEntry);
    } else {
      matchingDevtoolsCandidates.shift();
      matched.push(normalizedRecorderEntry);
    }
  }

  const devtoolsOnly = Array.from(devtoolsByEntryKey.values()).flat();

  return { matched, recorderOnly, devtoolsOnly };
}

function splitRecorderEntries(commit: SerializableFiberChange[]): {
  comparable: ComponentEntry[];
  skipped: SerializableFiberChange[];
} {
  const comparable: ComponentEntry[] = [];
  const skipped: SerializableFiberChange[] = [];
  for (const change of commit) {
    if (change.displayName != null) {
      comparable.push({ displayName: change.displayName, selfDuration: change.selfDuration });
    } else {
      skipped.push(change);
    }
  }
  return { comparable, skipped };
}

function splitDevtoolsEntries(components: DevtoolsRankedSummaryCommit["components"]): {
  comparable: ComponentEntry[];
  skipped: ComponentEntry[];
} {
  const comparable: ComponentEntry[] = [];
  const skipped: ComponentEntry[] = [];
  for (const component of components) {
    const entry: ComponentEntry = {
      displayName: component.name,
      selfDuration: component.duration,
    };
    if (isDevtoolsOnlyKind(component.name)) {
      skipped.push(entry);
    } else {
      comparable.push(entry);
    }
  }
  return { comparable, skipped };
}
