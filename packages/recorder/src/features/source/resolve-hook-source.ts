import type { CommittedFiberChange } from "@react-record/devtools-api";
import {
  getHookSourceLocation,
  getKeyFromHookSource,
  type SourceResults,
} from "./inspect-symbolicate-source";

type HookChange = NonNullable<CommittedFiberChange["hooks"]>[number];

export type SourceInfo = { sourceResults: SourceResults | null; projectRoot: string | null };

// `fileName` has its bundler prefix stripped but is otherwise the full path
export type DisplayLocation = { fileName: string; lineNumber: number; columnNumber: number };

export type HookSourceResolution =
  | { status: "pending" }
  | { status: "unavailable" }
  | { status: "unmapped"; location: DisplayLocation }
  | { status: "resolved"; location: DisplayLocation; ignored: boolean };

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

export function resolveHookSource(
  hook: HookChange,
  sourceInfo: SourceInfo | null,
): HookSourceResolution {
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
