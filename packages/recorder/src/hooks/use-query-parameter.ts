/** @jsxImportSource preact */
import { useMemo } from "preact/hooks";

export function useQueryParameter(): URLSearchParams {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return new URLSearchParams();
    }
    return new URLSearchParams(window.location.search);
  }, []);
}
