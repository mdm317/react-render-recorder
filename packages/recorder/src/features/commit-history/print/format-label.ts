import type { HookSourceResolution } from "@/features/source/resolve-hook-source";

const SOURCE_PATH_SEGMENT_LIMIT = 3;

// nameless components print as "Anonymous" like DevTools
export function formatDisplayName(displayName: string | null): string {
  return displayName ?? "Anonymous";
}

// null for an empty ancestorPath; frames are joined verbatim: ["A", 'B("x")'] → 'A > B("x")'
export function formatAncestorPath(ancestorPath: string[]): string | null {
  return ancestorPath.length === 0 ? null : ancestorPath.join(" > ");
}

// Keeps the last few path segments, like zsh's `truncation_length`: `a/b/c/d` → `b/c/d`.
// `webpack-internal:///./src/App.tsx` splits into empty segments, so it lands on `./src/App.tsx`
function truncateSourcePath(fileName: string): string {
  return fileName.split("/").slice(-SOURCE_PATH_SEGMENT_LIMIT).join("/");
}

export function formatHookSource(source: HookSourceResolution): string {
  switch (source.status) {
    case "pending":
      return "Resolving…";
    case "unavailable":
      return "Unavailable";
    case "unmapped": {
      const { fileName, lineNumber, columnNumber } = source.location;
      return `${truncateSourcePath(fileName)}:${lineNumber}:${columnNumber} (unmapped)`;
    }
    case "resolved": {
      const { fileName, lineNumber, columnNumber } = source.location;
      const librarySuffix = source.ignored ? " (library)" : "";
      return `${truncateSourcePath(fileName)}:${lineNumber}:${columnNumber}${librarySuffix}`;
    }
  }
}
