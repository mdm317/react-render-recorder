/** @jsxImportSource preact */
import { useMemo } from "preact/hooks";

function readQuery(): URLSearchParams | null {
  if (import.meta.env.DEV) {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search);
  }

  if (typeof document === "undefined") return null;
  const selfScript = document.currentScript as HTMLScriptElement | null;
  return selfScript?.src ? new URL(selfScript.src).searchParams : null;
}

export function useQueryParameter(): URLSearchParams | null {
  return useMemo(() => readQuery(), []);
}
