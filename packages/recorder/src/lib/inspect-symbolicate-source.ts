import {
  type CommittedFiberChange,
  symbolicateSource,
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

export type SourceLocation = { fileName: string; lineNumber: number; columnNumber: number };

export function getKeyFromHookSource(
  source: Pick<HookSource, "fileName" | "lineNumber" | "columnNumber">,
): string {
  return `${source.fileName}:${source.lineNumber}:${source.columnNumber}`;
}

type HookChange = NonNullable<CommittedFiberChange["hooks"]>[number];

export function getHookSourceLocation(hook: HookChange): SourceLocation | null {
  const source = "hookSource" in hook ? hook.hookSource : null;
  return isSourceLocation(source) ? source : null;
}

export function collectSourceLocations(fiberChanges: CommittedFiberChange[][]): SourceLocation[] {
  return fiberChanges
    .flat()
    .flatMap((change) => change.hooks ?? [])
    .flatMap((hook) => getHookSourceLocation(hook) ?? []);
}

function isSourceLocation(source: unknown): source is SourceLocation {
  return (
    source != null &&
    typeof source === "object" &&
    "fileName" in source &&
    source.fileName != null &&
    "lineNumber" in source &&
    source.lineNumber != null &&
    "columnNumber" in source &&
    source.columnNumber != null
  );
}

export async function inspectSymbolicateSource(
  locations: SourceLocation[],
): Promise<SourceResults> {
  const requests = new Map<string, Promise<SourceResults[string]>>();
  for (const location of locations) {
    const key = getKeyFromHookSource(location);
    if (!requests.has(key)) {
      requests.set(
        key,
        symbolicateSource(
          fetchFileWithCaching,
          location.fileName,
          location.lineNumber,
          location.columnNumber,
        ).catch(() => null),
      );
    }
  }
  return Object.fromEntries(
    await Promise.all([...requests].map(async ([key, request]) => [key, await request])),
  );
}
