import { symbolicateSource, type CommittedFiberChange } from "@react-record/devtools-api";

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

export async function inspectSymbolicateSource(
  fiberChanges: CommittedFiberChange[][],
): Promise<void> {
  const requests: Promise<void>[] = [];

  for (const commit of fiberChanges) {
    for (const change of commit) {
      for (const hook of change.hooks ?? []) {
        const source = "hookSource" in hook ? hook.hookSource : null;
        if (source?.fileName == null || source.lineNumber == null || source.columnNumber == null) {
          continue;
        }

        requests.push(
          symbolicateSource(
            fetchFileWithCaching,
            source.fileName,
            source.lineNumber,
            source.columnNumber,
          ).then((result) => {
            console.log("symbolicateSource result:", result, source);
          }),
        );
      }
    }
  }

  await Promise.all(requests);
}
