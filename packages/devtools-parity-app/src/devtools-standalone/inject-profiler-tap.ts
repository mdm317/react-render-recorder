// Taps the react-devtools-standalone backend WebSocket: notifies waiters when
// `profilingData` arrives, and exposes a hatch to synthesize frontend → backend
// messages (used by the compare window to drive Profiler start/stop).
//
// IMPORTANT: `installDevtoolsProfilerTap` is serialized via `.toString()` and
// inlined into a `<script>` tag (see `buildDevtoolsProfilerTapScriptTag`
// below), so it must be a self-contained closure — no imports, no
// module-scope references. All inputs come through the `matchPrefix`
// argument; all helpers must live inside the function body.

declare global {
  interface Window {
    __reactDevtoolsStandaloneProfilingDataWaiters?: Array<() => void>;
    __reactDevtoolsStandaloneBackendWS?: WebSocket;
    __simulateReactDevtoolsStandaloneFrontendMessage?: (
      event: string,
      payload?: unknown,
    ) => void;
  }
}

function installDevtoolsProfilerTap(matchPrefix: string): void {
  console.log(`[devtools-profiler-tap] installed (looking for ${matchPrefix})`);
  const OriginalWS = window.WebSocket;

  function tap(raw: unknown): void {
    if (typeof raw !== "string") return;
    let msg: { event?: string } | null;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || msg.event !== "profilingData") return;
    const waiters = window.__reactDevtoolsStandaloneProfilingDataWaiters;
    if (Array.isArray(waiters) && waiters.length > 0) {
      waiters.splice(0).forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
    }
  }

  class TappedWS extends OriginalWS {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      const isBackend = typeof url === "string" && url.indexOf(matchPrefix) !== -1;
      console.log(
        "[devtools-profiler-tap] WebSocket open ->",
        url,
        isBackend ? "(react-devtools-standalone backend)" : "",
      );
      if (isBackend) {
        window.__reactDevtoolsStandaloneBackendWS = this;
        this.addEventListener("message", (ev: MessageEvent) => tap(ev.data));
      }
    }

    send(data: Parameters<WebSocket["send"]>[0]): void {
      if (this === window.__reactDevtoolsStandaloneBackendWS) tap(data);
      return super.send(data);
    }
  }

  window.WebSocket = TappedWS as typeof WebSocket;

  window.__simulateReactDevtoolsStandaloneFrontendMessage = function (event, payload) {
    const ws = window.__reactDevtoolsStandaloneBackendWS;
    if (!ws) {
      throw new Error(
        "react-devtools standalone backend WebSocket not initialized yet (standalone DevTools may not be connected)",
      );
    }
    const handler = (ws as WebSocket & { onmessage?: (ev: { data: string }) => void })
      .onmessage;
    if (typeof handler !== "function") {
      throw new Error(
        "react-devtools standalone backend onmessage handler not registered yet",
      );
    }
    handler({ data: JSON.stringify({ event: event, payload: payload }) });
  };
}

export function buildDevtoolsProfilerTapScriptTag(host: string, port: number): string {
  // Match the URL the react-devtools standalone backend uses (`<host>:<port>`)
  // so the tap doesn't latch onto unrelated sockets like Next.js HMR.
  const matchPrefix = `${host}:${port}`;
  return `<script>(${installDevtoolsProfilerTap.toString()})(${JSON.stringify(matchPrefix)})</script>`;
}
