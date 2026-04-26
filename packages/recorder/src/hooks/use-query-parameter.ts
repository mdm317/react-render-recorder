/** @jsxImportSource preact */
import { useMemo } from "preact/hooks";

const selfScript =
  typeof document !== "undefined"
    ? (document.currentScript as HTMLScriptElement | null)
    : null;

const selfScriptQuery: URLSearchParams | null = selfScript?.src
  ? new URL(selfScript.src).searchParams
  : null;

export function useQueryParameter(): URLSearchParams | null {
  return useMemo(() => selfScriptQuery, []);
}
