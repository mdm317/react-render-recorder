import { getTargetWindow } from "./target-window";

// Generic CDP `Runtime.evaluate` runner against the currently open target
// window. Returns `{ ok, error }`; callers don't get the evaluated value back
// — for that, talk to the debugger directly (see
// `recorder/fetch-fiber-changes.ts`).
export async function evalOnTarget(
  expression: string,
  options: { awaitPromise?: boolean } = {},
): Promise<{ ok: boolean; error: string | null }> {
  const targetWindow = getTargetWindow();
  if (!targetWindow || targetWindow.isDestroyed()) {
    return { ok: false, error: 'No target window open. Click "Open" first.' };
  }
  const wc = targetWindow.webContents;
  if (!wc.debugger.isAttached()) {
    return { ok: false, error: "CDP debugger is not attached to the target window." };
  }
  try {
    const evalResult = (await wc.debugger.sendCommand("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: options.awaitPromise ?? false,
    })) as {
      exceptionDetails?: { text?: string; exception?: { description?: string } };
    };
    if (evalResult.exceptionDetails) {
      const description =
        evalResult.exceptionDetails.exception?.description ||
        evalResult.exceptionDetails.text ||
        "Runtime.evaluate raised an exception";
      return { ok: false, error: description };
    }
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: (err as Error).message || String(err) };
  }
}
