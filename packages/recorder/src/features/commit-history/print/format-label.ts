import type { HookSourceResolution } from "@/features/source/resolve-hook-source";

const ANCESTOR_HOOK_PATTERN = /^(.+?)\("(.+)"\)$/;

const SOURCE_PATH_SEGMENT_LIMIT = 3;

// nameless components print as "Anonymous" like DevTools
export function formatDisplayName(displayName: string | null): string {
  return displayName ?? "Anonymous";
}

// null for an empty ancestorPath; a single ancestor has its debug label parsed
// (['Floating("root")'] → 'Floating, debug="root"'), several are joined verbatim (["A", "B"] → "A > B")
export function formatAncestorPath(ancestorPath: string[]): string | null {
  if (ancestorPath.length === 0) return null;
  if (ancestorPath.length > 1) return ancestorPath.join(" > ");
  const match = ANCESTOR_HOOK_PATTERN.exec(ancestorPath[0]);
  return match == null ? ancestorPath[0] : `${match[1]}, debug="${match[2]}"`;
}

// Keeps the last few path segments, like zsh's `truncation_length`: `a/b/c/d` → `b/c/d`.
// `webpack-internal:///./src/App.tsx` splits into empty segments, so it lands on `./src/App.tsx`
function truncateSourcePath(fileName: string): string {
  return fileName.split("/").slice(-SOURCE_PATH_SEGMENT_LIMIT).join("/");
}

// The package follows the last `node_modules/` (pnpm nests `.pnpm/<id>/node_modules/<pkg>`) and keeps
// its scope: `node_modules/@base-ui/utils/esm/x.js` → `@base-ui/utils`; null outside node_modules
function findLibraryPackageName(fileName: string): string | null {
  const index = fileName.lastIndexOf("node_modules/");
  if (index === -1) return null;
  const [first, second] = fileName.slice(index + "node_modules/".length).split("/");
  if (first == null || first === "") return null;
  if (!first.startsWith("@")) return first;
  return second == null || second === "" ? null : `${first}/${second}`;
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
      // ignore-listed code is not a place to edit, so its path gives way to the package name when the
      // path has one; the source map's ignore list alone decides what counts as library code
      if (source.ignored) {
        const packageName = findLibraryPackageName(fileName);
        return packageName == null ? "library" : `library (${packageName})`;
      }
      return `${truncateSourcePath(fileName)}:${lineNumber}:${columnNumber}`;
    }
  }
}
