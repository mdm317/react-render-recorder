import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as fs from 'fs';
import * as http from 'http';
import type { AddressInfo } from 'net';
import { join, resolve } from 'path';

// `recorder` and `fiberChanges` are forwarded through the IPC layer untouched;
// their concrete shapes live in the recorder package and are consumed in the
// compare renderer (`src/compare/App.tsx`), where Vite resolves the recorder
// source path. Keeping them as `unknown` here avoids dragging recorder source
// files (and their transitive imports) into the tsc project for `main.ts`.
type RecorderSnapshot = unknown;
type SerializableFiberChange = unknown;

let devtoolsWindow: BrowserWindow | null = null;
let targetWindow: BrowserWindow | null = null;
let compareWindow: BrowserWindow | null = null;

function createDevtoolsWindow() {
  devtoolsWindow = new BrowserWindow({
    width: 960,
    height: 720,
    title: 'React DevTools (Standalone)',
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      preload: join(__dirname, 'preload.js'),
    },
  });

  devtoolsWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const htmlPath = resolve(__dirname, '..', 'src', 'renderer', 'index.html');
  devtoolsWindow.loadFile(htmlPath);

  devtoolsWindow.on('closed', () => {
    devtoolsWindow = null;
  });
}

function buildBackendScriptTag(host: string, port: number): string {
  return `<script src="http://${host}:${port}"></script>`;
}

function buildWsTapScript(host: string, port: number): string {
  // Match the URL the devtools backend uses (`<protocol>://<host>:<port><path>`)
  // so we don't latch onto unrelated sockets like Next.js HMR.
  const matchPrefix = `${host}:${port}`;
  return `<script>
(() => {
  console.log('[devtools-tap] installed (looking for ${matchPrefix})');
  const OriginalWS = window.WebSocket;
  const MATCH = ${JSON.stringify(matchPrefix)};
  function tap(direction, raw) {
    if (typeof raw !== 'string') return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || !msg.event) return;
    if (msg.event === 'profilingData') {
      // Multiple renderers (e.g. flight RSC + client) each emit a
      // profilingData event. Merge dataForRoots across them in this session.
      const prev = window.__lastProfilingData;
      const incomingRoots = msg.payload && Array.isArray(msg.payload.dataForRoots)
        ? msg.payload.dataForRoots
        : [];
      if (prev && Array.isArray(prev.dataForRoots)) {
        window.__lastProfilingData = Object.assign({}, msg.payload, {
          dataForRoots: prev.dataForRoots.concat(incomingRoots),
        });
      } else {
        window.__lastProfilingData = msg.payload;
      }
      console.log('[devtools-tap] profilingData (merged dataForRoots:',
        (window.__lastProfilingData.dataForRoots || []).length, ')');
    }
  }
  class TappedWS extends OriginalWS {
    constructor(url, protocols) {
      super(url, protocols);
      const isBackend = typeof url === 'string' && url.indexOf(MATCH) !== -1;
      console.log('[devtools-tap] WebSocket open ->', url, isBackend ? '(backend)' : '');
      if (isBackend) {
        window.__devtoolsBackendWS = this;
        this.addEventListener('message', (ev) => tap('in', ev.data));
      }
    }
    send(data) {
      if (this === window.__devtoolsBackendWS) tap('out', data);
      return super.send(data);
    }
  }
  window.WebSocket = TappedWS;
  window.__simulateDevtoolsFrontendMessage = function (event, payload) {
    const ws = window.__devtoolsBackendWS;
    if (!ws) {
      throw new Error('devtools backend WebSocket not initialized yet (standalone DevTools may not be connected)');
    }
    const handler = ws.onmessage;
    if (typeof handler !== 'function') {
      throw new Error('devtools backend onmessage handler not registered yet');
    }
    handler({ data: JSON.stringify({ event: event, payload: payload }) });
  };
})();
</script>`;
}

const RECORDER_BUNDLE_PATH = resolve(
  __dirname,
  '..',
  '..',
  'recorder',
  'dist',
  'react-render-recorder.js',
);
const RECORDER_BUNDLE_NAME = 'react-render-recorder.js';
const RECORDER_QUERY = 'debug=true&shortcut=true';

let recorderServerOrigin: string | null = null;
let cachedRecorderBundle: Buffer | null | undefined;

function readRecorderBundle(): Buffer | null {
  if (cachedRecorderBundle !== undefined) return cachedRecorderBundle;
  try {
    cachedRecorderBundle = fs.readFileSync(RECORDER_BUNDLE_PATH);
  } catch (err) {
    console.error(
      `[devtools-parity-app] Failed to read recorder bundle at ${RECORDER_BUNDLE_PATH}:`,
      err,
    );
    cachedRecorderBundle = null;
  }
  return cachedRecorderBundle;
}

function startRecorderServer(): Promise<string | null> {
  return new Promise((resolveOrigin) => {
    const server = http.createServer((req, res) => {
      const bundle = readRecorderBundle();
      if (bundle == null) {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('recorder bundle not available');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      res.end(bundle);
    });

    server.on('error', (err) => {
      console.error('[devtools-parity-app] recorder server error:', err);
      resolveOrigin(null);
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      const origin = `http://127.0.0.1:${addr.port}`;
      recorderServerOrigin = origin;
      console.log(`[devtools-parity-app] recorder bundle served at ${origin}/${RECORDER_BUNDLE_NAME}`);
      resolveOrigin(origin);
    });
  });
}

function buildRecorderScriptTag(): string | null {
  if (recorderServerOrigin == null) return null;
  return `<script src="${recorderServerOrigin}/${RECORDER_BUNDLE_NAME}?${RECORDER_QUERY}"></script>`;
}

function injectIntoHtml(html: string, scriptTags: string): string {
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${scriptTags}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(
      /<html[^>]*>/i,
      (m) => `${m}<head>${scriptTags}</head>`,
    );
  }
  return `${scriptTags}${html}`;
}

async function setupDocumentInterception(
  wc: Electron.WebContents,
  host: string,
  port: number,
) {
  const backendTag = buildBackendScriptTag(host, port);
  const recorderTag = buildRecorderScriptTag();
  const wsTapScript = buildWsTapScript(host, port);
  const scriptTags = [wsTapScript, backendTag, recorderTag]
    .filter(Boolean)
    .join('');
  if (recorderTag == null) {
    console.warn(
      '[devtools-parity-app] recorder tag is null — recorder bundle will not be injected.',
    );
  } else {
    console.log('[devtools-parity-app] injecting recorder tag:', recorderTag);
  }

  if (!wc.debugger.isAttached()) {
    wc.debugger.attach('1.3');
  }

  wc.debugger.on('detach', (_event, reason) => {
    console.warn('[devtools-parity-app] CDP detached:', reason);
  });

  wc.debugger.on('message', async (_event, method, params) => {
    if (method !== 'Fetch.requestPaused') return;
    const { requestId, resourceType, responseStatusCode } = params as {
      requestId: string;
      resourceType: string;
      responseStatusCode?: number;
    };

    try {
      // Only modify the main HTML document; let everything else flow through.
      if (resourceType !== 'Document' || responseStatusCode == null) {
        await wc.debugger.sendCommand('Fetch.continueRequest', { requestId });
        return;
      }

      const { body, base64Encoded } = (await wc.debugger.sendCommand(
        'Fetch.getResponseBody',
        { requestId },
      )) as { body: string; base64Encoded: boolean };

      const decoded = base64Encoded
        ? Buffer.from(body, 'base64').toString('utf8')
        : body;

      const lower = decoded.slice(0, 4096).toLowerCase();
      const looksLikeHtml =
        lower.includes('<html') || lower.includes('<!doctype html');
      const modified = looksLikeHtml
        ? injectIntoHtml(decoded, scriptTags)
        : decoded;
      console.log(
        `[devtools-parity-app] Document intercepted: status=${responseStatusCode} html=${looksLikeHtml} bytes=${decoded.length} modified=${modified.length}`,
      );

      const responseHeaders = (
        params as { responseHeaders?: Array<{ name: string; value: string }> }
      ).responseHeaders;
      const filteredHeaders = (responseHeaders || []).filter(
        (h) =>
          h.name.toLowerCase() !== 'content-length' &&
          h.name.toLowerCase() !== 'content-encoding' &&
          h.name.toLowerCase() !== 'content-security-policy' &&
          h.name.toLowerCase() !== 'content-security-policy-report-only',
      );

      await wc.debugger.sendCommand('Fetch.fulfillRequest', {
        requestId,
        responseCode: responseStatusCode,
        responseHeaders: filteredHeaders,
        body: Buffer.from(modified, 'utf8').toString('base64'),
      });
    } catch (err) {
      console.error('[devtools-parity-app] Fetch handler error:', err);
      try {
        await wc.debugger.sendCommand('Fetch.continueRequest', { requestId });
      } catch {
        /* ignore */
      }
    }
  });

  await wc.debugger.sendCommand('Fetch.enable', {
    patterns: [
      {
        urlPattern: '*',
        resourceType: 'Document',
        requestStage: 'Response',
      },
    ],
  });
}

async function openTargetUrl(rawUrl: string, host: string, port: number) {
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.close();
    targetWindow = null;
  }

  targetWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    title: `Inspecting: ${rawUrl}`,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      webSecurity: false,
    },
  });

  const wc = targetWindow.webContents;

  // Forward target page console + load errors to main stdout so we can debug.
  wc.on('console-message', (_evt, level, message, line, sourceId) => {
    console.log(`[target/${level}] ${message} (${sourceId}:${line})`);
  });
  wc.on('did-fail-load', (_evt, errorCode, errorDescription, validatedURL) => {
    console.error(
      `[target/load-fail] ${validatedURL} → ${errorCode} ${errorDescription}`,
    );
  });

  try {
    await setupDocumentInterception(wc, host, port);
  } catch (err) {
    console.error('[devtools-parity-app] Failed to set up CDP:', err);
  }

  targetWindow.on('closed', () => {
    targetWindow = null;
  });

  await targetWindow.loadURL(rawUrl);
}

function closeTargetUrl() {
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.close();
  }
  targetWindow = null;
}

type ComparisonResult = {
  capturedAt: number;
  error: string | null;
  fiberChanges: SerializableFiberChange[][] | null;
  fiberChangesAvailable: boolean;
  recorder: RecorderSnapshot | null;
  recorderAvailable: boolean;
  targetUrl: string | null;
};

const COMPARISON_EVAL_EXPRESSION = `(() => {
  try {
    const recorderApi = (typeof window !== 'undefined' && window.__REACT_RENDER_RECORDER__) || null;
    const recorder = (recorderApi && typeof recorderApi.snapshot === 'function')
      ? recorderApi.snapshot()
      : null;
    const fiberChanges = (recorderApi && typeof recorderApi.getFiberChanges === 'function')
      ? recorderApi.getFiberChanges()
      : null;
    return JSON.stringify({
      recorder,
      recorderAvailable: recorder != null,
      fiberChanges,
      fiberChangesAvailable: fiberChanges != null,
    });
  } catch (err) {
    return JSON.stringify({ __error: (err && err.message) || String(err) });
  }
})()`;

type EvalOnTargetResult = { ok: boolean; error: string | null };

async function evalOnTarget(expression: string): Promise<EvalOnTargetResult> {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return { ok: false, error: 'No target window open. Click "Open" first.' };
  }
  const wc = targetWindow.webContents;
  if (!wc.debugger.isAttached()) {
    return { ok: false, error: 'CDP debugger is not attached to the target window.' };
  }
  try {
    const evalResult = (await wc.debugger.sendCommand('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: false,
    })) as {
      exceptionDetails?: { text?: string; exception?: { description?: string } };
    };
    if (evalResult.exceptionDetails) {
      const description =
        evalResult.exceptionDetails.exception?.description ||
        evalResult.exceptionDetails.text ||
        'Runtime.evaluate raised an exception';
      return { ok: false, error: description };
    }
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: (err as Error).message || String(err) };
  }
}

const RECORDER_START_EXPR = `(() => {
  const api = window.__REACT_RENDER_RECORDER__;
  if (!api || typeof api.start !== 'function') {
    throw new Error('window.__REACT_RENDER_RECORDER__.start is not available');
  }
  api.start();
  return true;
})()`;

const RECORDER_END_EXPR = `(() => {
  const api = window.__REACT_RENDER_RECORDER__;
  if (!api || typeof api.end !== 'function') {
    throw new Error('window.__REACT_RENDER_RECORDER__.end is not available');
  }
  api.end();
  return true;
})()`;

const PROFILER_START_EXPR = `(() => {
  // Reset any prior session data so the next stop produces a fresh snapshot.
  window.__lastProfilingData = null;
  window.__simulateDevtoolsFrontendMessage('startProfiling', { recordChangeDescriptions: false, recordTimeline: true });
  return true;
})()`;

// After stopping the profiler, ask the backend to emit profilingData for every
// known renderer. The backend responds via bridge.send('profilingData', …),
// which our WS tap captures into window.__lastProfilingData.
const PROFILER_STOP_EXPR = `(() => {
  window.__simulateDevtoolsFrontendMessage('stopProfiling');
  const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook || !hook.renderers || typeof hook.renderers.keys !== 'function') {
    return { stopped: true, requested: 0, reason: 'no devtools hook / renderers' };
  }
  const ids = Array.from(hook.renderers.keys());
  let succeeded = 0;
  const failures = [];
  for (const rendererID of ids) {
    try {
      window.__simulateDevtoolsFrontendMessage('getProfilingData', { rendererID });
      succeeded++;
    } catch (err) {
      // Some renderers (e.g. flight/RSC) don't support profiling — skip.
      failures.push(rendererID + ':' + (err && err.message));
    }
  }
  return {
    stopped: true,
    requested: succeeded,
    skipped: failures.length,
    reason: failures.length ? failures.join(' | ') : null,
  };
})()`;

async function fetchComparisonFromTarget(): Promise<ComparisonResult> {
  const baseResult: ComparisonResult = {
    capturedAt: Date.now(),
    error: null,
    fiberChanges: null,
    fiberChangesAvailable: false,
    recorder: null,
    recorderAvailable: false,
    targetUrl: null,
  };

  if (!targetWindow || targetWindow.isDestroyed()) {
    return { ...baseResult, error: 'No target window open. Click "Open" first.' };
  }

  const wc = targetWindow.webContents;
  baseResult.targetUrl = wc.getURL() || null;

  if (!wc.debugger.isAttached()) {
    return { ...baseResult, error: 'CDP debugger is not attached to the target window.' };
  }

  try {
    const evalResult = (await wc.debugger.sendCommand('Runtime.evaluate', {
      expression: COMPARISON_EVAL_EXPRESSION,
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
        'Runtime.evaluate raised an exception';
      return { ...baseResult, error: description };
    }

    const raw = evalResult.result?.value;
    if (typeof raw !== 'string') {
      return { ...baseResult, error: 'Runtime.evaluate returned no value.' };
    }

    // The target page produces these fields via COMPARISON_EVAL_EXPRESSION;
    // we trust the structure but accept null/undefined for the data slots.
    let parsed: {
      fiberChanges?: SerializableFiberChange[][] | null;
      fiberChangesAvailable?: boolean;
      recorder?: RecorderSnapshot | null;
      recorderAvailable?: boolean;
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
      recorder: parsed.recorder ?? null,
      recorderAvailable: Boolean(parsed.recorderAvailable),
    };
  } catch (err) {
    return { ...baseResult, error: (err as Error).message || String(err) };
  }
}

function createCompareWindow() {
  if (compareWindow && !compareWindow.isDestroyed()) {
    compareWindow.focus();
    return;
  }

  compareWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    title: 'Recorder ↔ DevTools Comparison',
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      preload: join(__dirname, 'preload.js'),
    },
  });

  const htmlPath = resolve(__dirname, 'compare', 'index.html');
  compareWindow.loadFile(htmlPath);

  compareWindow.on('closed', () => {
    compareWindow = null;
  });
}

app.on('window-all-closed', () => {
  app.quit();
});

app.on('ready', async () => {
  await startRecorderServer();

  ipcMain.handle(
    'devtools-parity-app:open-target',
    async (
      _evt,
      payload: { url: string; host: string; port: number },
    ): Promise<void> => {
      await openTargetUrl(payload.url, payload.host, payload.port);
    },
  );

  ipcMain.handle('devtools-parity-app:close-target', () => {
    closeTargetUrl();
  });

  ipcMain.handle('devtools-parity-app:open-compare', () => {
    createCompareWindow();
  });

  ipcMain.handle('devtools-parity-app:fetch-comparison', async () => {
    return fetchComparisonFromTarget();
  });

  ipcMain.handle('devtools-parity-app:recorder-start', () =>
    evalOnTarget(RECORDER_START_EXPR),
  );
  ipcMain.handle('devtools-parity-app:recorder-end', () =>
    evalOnTarget(RECORDER_END_EXPR),
  );
  ipcMain.handle('devtools-parity-app:profiler-start', () =>
    evalOnTarget(PROFILER_START_EXPR),
  );
  ipcMain.handle('devtools-parity-app:profiler-stop', () =>
    evalOnTarget(PROFILER_STOP_EXPR),
  );

  createDevtoolsWindow();
});
