import {
  symbolicateSource,
  type CommittedFiberChange,
  type HookSource,
  type SourceMappedLocation,
} from "@react-record/devtools-api";

const fileCache = new Map<string, Promise<string>>();

function fetchFileWithCaching(url: string): Promise<string> {
  const cached = fileCache.get(url);
  if (cached != null) return cached;

  const request = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
      return response.text();
    })
    .catch((error: unknown) => {
      fileCache.delete(url);
      throw error;
    });

  fileCache.set(url, request);
  return request;
}

export type SourceResults = Record<string, SourceMappedLocation | null>;

export function getKeyFromHookSource(source: HookSource): string {
  return `${source.fileName}:${source.lineNumber}:${source.columnNumber}`;
}

export async function inspectSymbolicateSource(
  fiberChanges: CommittedFiberChange[][],
): Promise<SourceResults> {
  const requests = new Map<string, Promise<SourceResults[string]>>();
  for (const commit of fiberChanges) {
    for (const change of commit) {
      for (const hook of change.hooks ?? []) {
        const source = "hookSource" in hook ? hook.hookSource : null;
        if (source?.fileName == null || source.lineNumber == null || source.columnNumber == null) {
          continue;
        }
        const key = getKeyFromHookSource(source);
        if (!requests.has(key)) {
          requests.set(
            key,
            symbolicateSource(
              fetchFileWithCaching,
              source.fileName,
              source.lineNumber,
              source.columnNumber,
            ).catch(() => null),
          );
        }
      }
    }
  }
  return Object.fromEntries(
    await Promise.all([...requests].map(async ([key, request]) => [key, await request])),
  );
}
