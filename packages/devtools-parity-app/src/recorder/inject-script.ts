import { getRecorderBundleUrl } from "./server";

// `<script>` tag that loads the recorder bundle served by the local HTTP
// server (see `./server.ts`). Returns null when the server hasn't finished
// starting yet — callers should warn rather than block.
export function buildRecorderBundleScriptTag(): string | null {
  const url = getRecorderBundleUrl();
  if (url == null) return null;
  return `<script src="${url}"></script>`;
}
