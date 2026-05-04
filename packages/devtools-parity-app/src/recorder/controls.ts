import { getTargetWindow } from "../windows/target/target-window";

// =============================================================================
// Recorder controls
// -----------------------------------------------------------------------------
// Two flavors of "operating the recorder running in the target page":
//
//   1. Start / End  (target page, via CDP Runtime.evaluate)
//      JS expression strings that drive the recorder's start/end hooks
//      installed at `window.__REACT_RENDER_RECORDER__`.
//
//   2. Read fiberChanges  (target page, via CDP Runtime.evaluate with
//      returnByValue) — pulls the recorder's captured commit data back to
//      the main process.
// =============================================================================

export const RECORDER_START_EXPR = `(() => {
  const api = window.__REACT_RENDER_RECORDER__;
  if (!api || typeof api.start !== 'function') {
    throw new Error('window.__REACT_RENDER_RECORDER__.start is not available');
  }
  api.start();
  return true;
})()`;

export const RECORDER_END_EXPR = `(() => {
  const api = window.__REACT_RENDER_RECORDER__;
  if (!api || typeof api.end !== 'function') {
    throw new Error('window.__REACT_RENDER_RECORDER__.end is not available');
  }
  api.end();
  return true;
})()`;

// `fiberChanges` is forwarded through the IPC layer untouched; its concrete
// shape lives in the recorder package and is consumed in the compare renderer
// (`src/windows/compare/app/App.tsx`), where Vite resolves the recorder source path.
// Keeping it as `unknown` here avoids dragging recorder source files (and
// their transitive imports) into the tsc project for the main process.
export type FiberChangesResult = {
  capturedAt: number;
  error: string | null;
  fiberChanges: unknown[][] | null;
  fiberChangesAvailable: boolean;
  targetUrl: string | null;
};

// Replacer source embedded into the target-page eval. The recorder returns raw
// fiberChanges with cyclic / non-serializable values intact (DOM refs in hook
// prev/next, BigInt, functions, Symbols, deeper cycles via fiber backpointers
// like HTMLButtonElement.__reactFiber → FiberNode.stateNode). This replacer
// guards the outer JSON.stringify so CDP marshalling doesn't throw and the
// resulting payload contains descriptive placeholders.
const SAFE_JSON_REPLACER_SOURCE = `
function createSafeJsonReplacer() {
  const seen = new WeakSet();
  return function (_key, value) {
    if (typeof value === 'bigint') return value + 'n';
    if (typeof value === 'function') return '[Function ' + (value.name || 'anonymous') + ']';
    if (typeof value === 'symbol') return value.toString();
    if (value === undefined) return '[undefined]';
    const isElementInstance = typeof Element !== 'undefined' && value instanceof Element;
    const isElementLike =
      isElementInstance ||
      (typeof value === 'object' && value !== null &&
        value.nodeType === 1 && typeof value.tagName === 'string');
    if (isElementLike) {
      const tag = String(value.tagName).toLowerCase();
      const idStr =
        typeof value.id === 'string'
          ? value.id
          : typeof value.getAttribute === 'function'
            ? value.getAttribute('id') || ''
            : '';
      const classStr =
        typeof value.className === 'string'
          ? value.className
          : typeof value.getAttribute === 'function'
            ? value.getAttribute('class') || ''
            : '';
      const id = idStr.trim();
      const classes = classStr.trim().split(/\\s+/).filter(Boolean).slice(0, 3);
      return '[HTMLElement ' + tag + (id ? '#' + id : '') +
        (classes.length ? '.' + classes.join('.') : '') + ']';
    }
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  };
}
`;

const FIBER_CHANGES_EVAL_EXPRESSION = `(() => {
  ${SAFE_JSON_REPLACER_SOURCE}
  try {
    const recorderApi = (typeof window !== 'undefined' && window.__REACT_RENDER_RECORDER__) || null;
    if (!recorderApi || typeof recorderApi.getFiberChanges !== 'function') {
      return JSON.stringify({ fiberChanges: null, fiberChangesAvailable: false });
    }
    const fiberChanges = recorderApi.getFiberChanges();
    return JSON.stringify({
      fiberChanges,
      fiberChangesAvailable: fiberChanges != null,
    }, createSafeJsonReplacer());
  } catch (err) {
    return JSON.stringify({ __error: (err && err.message) || String(err) });
  }
})()`;

export async function fetchFiberChangesFromTarget(): Promise<FiberChangesResult> {
  const baseResult: FiberChangesResult = {
    capturedAt: Date.now(),
    error: null,
    fiberChanges: null,
    fiberChangesAvailable: false,
    targetUrl: null,
  };

  const targetWindow = getTargetWindow();
  if (!targetWindow || targetWindow.isDestroyed()) {
    return { ...baseResult, error: 'No target window open. Click "Open" first.' };
  }

  const wc = targetWindow.webContents;
  baseResult.targetUrl = wc.getURL() || null;

  if (!wc.debugger.isAttached()) {
    return { ...baseResult, error: "CDP debugger is not attached to the target window." };
  }

  try {
    const evalResult = (await wc.debugger.sendCommand("Runtime.evaluate", {
      expression: FIBER_CHANGES_EVAL_EXPRESSION,
      returnByValue: true,
      awaitPromise: false,
    })) as {
      result: { type: string; value?: string };
      exceptionDetails?: { text?: string; exception?: { description?: string } };
    };

    if (evalResult.exceptionDetails) {
      const description =
        evalResult.exceptionDetails.exception?.description ||
        evalResult.exceptionDetails.text ||
        "Runtime.evaluate raised an exception";
      return { ...baseResult, error: description };
    }

    const raw = evalResult.result?.value;
    if (typeof raw !== "string") {
      return { ...baseResult, error: "Runtime.evaluate returned no value." };
    }

    let parsed: {
      fiberChanges?: unknown[][] | null;
      fiberChangesAvailable?: boolean;
      __error?: string;
    };
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return {
        ...baseResult,
        error: `Failed to parse Runtime.evaluate payload: ${(err as Error).message}`,
      };
    }

    if (parsed.__error) {
      return { ...baseResult, error: `Target page threw: ${parsed.__error}` };
    }

    return {
      ...baseResult,
      fiberChanges: parsed.fiberChanges ?? null,
      fiberChangesAvailable: Boolean(parsed.fiberChangesAvailable),
    };
  } catch (err) {
    return { ...baseResult, error: (err as Error).message || String(err) };
  }
}
