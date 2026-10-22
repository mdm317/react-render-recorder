import type { CommittedFiberChange } from "@react-record/devtools-api";
import { groupCommitsByPaint } from "./group-commits-by-paint";
import {
  getHookSourceLocation,
  getKeyFromHookSource,
  type SourceResults,
} from "./inspect-symbolicate-source";

type HookChange = NonNullable<CommittedFiberChange["hooks"]>[number];

export type SourceInfo = { sourceResults: SourceResults | null; projectRoot: string | null };

// `fileName` is already shortened for display
type DisplayLocation = { fileName: string; lineNumber: number; columnNumber: number };

export type HookSourceResolution =
  | { status: "pending" }
  | { status: "unavailable" }
  | { status: "unmapped"; location: DisplayLocation }
  | { status: "resolved"; location: DisplayLocation; ignored: boolean };

export type CommitHistoryHookChange = HookChange & { source: HookSourceResolution };
export type CommitHistoryFiberChange = Omit<CommittedFiberChange, "hooks"> & {
  hooks: CommitHistoryHookChange[] | null;
};

const URL_ORIGIN = /^https?:\/\/[^/?#]+/i;
// `webpack://<name>/./src/App.jsx?1591` and `webpack:///./src/App.jsx`; the query is webpack's module hash
const WEBPACK_SOURCE = /^webpack:\/\/[^/]*\/\.\/([^?]*)(\?.*)?$/;

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Strips the prefix each bundler puts in front of a source path; anything unrecognised is left as is.
function stripBundlerPrefix(fileName: string, projectRoot: string | null): string {
  const webpackSource = WEBPACK_SOURCE.exec(fileName);
  if (webpackSource != null) return webpackSource[1];
  if (fileName.startsWith("file://")) {
    const path = safeDecodeURIComponent(fileName.slice("file://".length));
    // `projectRoot` was found on the decoded path, so compare against the decoded form
    return projectRoot != null && path.startsWith(`${projectRoot}/`)
      ? path.slice(projectRoot.length + 1)
      : path;
  }
  return fileName.replace(URL_ORIGIN, "");
}

function prepareSource(hook: HookChange, sourceInfo: SourceInfo | null): HookSourceResolution {
  const source = getHookSourceLocation(hook);
  if (source == null) return { status: "unavailable" };
  if (sourceInfo?.sourceResults == null) return { status: "pending" };
  const result = sourceInfo.sourceResults[getKeyFromHookSource(source)];
  if (result === undefined) return { status: "pending" };
  if (result === null) {
    return {
      status: "unmapped",
      location: {
        fileName: source.fileName.replace(URL_ORIGIN, ""),
        lineNumber: source.lineNumber,
        columnNumber: source.columnNumber,
      },
    };
  }
  const [, fileName, lineNumber, columnNumber] = result.location;
  return {
    status: "resolved",
    location: {
      fileName: stripBundlerPrefix(fileName, sourceInfo.projectRoot),
      lineNumber,
      columnNumber,
    },
    ignored: result.ignored,
  };
}

export function buildCommitHistory(
  fiberChanges: CommittedFiberChange[][],
  sourceInfo: SourceInfo | null = null,
): CommitHistoryFiberChange[][] {
  return fiberChanges.map((commit) =>
    commit.map((change) => ({
      ...change,
      hooks:
        change.hooks?.map((hook) => ({
          ...hook,
          source: prepareSource(hook, sourceInfo),
        })) ?? null,
    })),
  );
}

export function buildCommitHistoryGroups({
  fiberChanges,
  paintCommitIndices,
  ...sourceInfo
}: SourceInfo & {
  fiberChanges: CommittedFiberChange[][];
  paintCommitIndices: number[];
}): CommitHistoryFiberChange[][][] {
  return groupCommitsByPaint({ fiberChangesByCommit: fiberChanges, paintCommitIndices }).map(
    (commits) => buildCommitHistory(commits, sourceInfo),
  );
}
