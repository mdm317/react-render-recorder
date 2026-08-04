export function isInsideInputDispatch(): boolean {
  const event = typeof window !== "undefined" ? window.event : undefined;
  if (event === undefined) {
    return false;
  }
  return typeof MessageEvent === "undefined" || !(event instanceof MessageEvent);
}
