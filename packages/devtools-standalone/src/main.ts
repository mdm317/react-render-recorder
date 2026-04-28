import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as fs from 'fs';
import { join, resolve } from 'path';

let devtoolsWindow: BrowserWindow | null = null;
let targetWindow: BrowserWindow | null = null;

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

const RECORDER_BUNDLE_PATH = resolve(
  __dirname,
  '..',
  '..',
  'recorder',
  'dist',
  'react-render-recorder.js?debug=true&shortcut=true',
);

let cachedRecorderTag: string | null | undefined;

function buildRecorderScriptTag(): string | null {
  if (cachedRecorderTag !== undefined) return cachedRecorderTag;
  try {
    const source = fs.readFileSync(RECORDER_BUNDLE_PATH, 'utf8');
    // Escape any literal "</script>" inside the bundle so the inline tag
    // is not closed prematurely by the HTML parser.
    const safe = source.replace(/<\/script>/gi, '<\\/script>');
    cachedRecorderTag = `<script>${safe}</script>`;
  } catch (err) {
    console.error(
      `[devtools-standalone] Failed to read recorder bundle at ${RECORDER_BUNDLE_PATH}:`,
      err,
    );
    cachedRecorderTag = null;
  }
  return cachedRecorderTag;
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
  const scriptTags = [backendTag, recorderTag].filter(Boolean).join('');

  if (!wc.debugger.isAttached()) {
    wc.debugger.attach('1.3');
  }

  wc.debugger.on('detach', (_event, reason) => {
    console.warn('[devtools-standalone] CDP detached:', reason);
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
      console.error('[devtools-standalone] Fetch handler error:', err);
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
    console.error('[devtools-standalone] Failed to set up CDP:', err);
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

app.on('window-all-closed', () => {
  app.quit();
});

app.on('ready', () => {
  ipcMain.handle(
    'devtools-standalone:open-target',
    async (
      _evt,
      payload: { url: string; host: string; port: number },
    ): Promise<void> => {
      await openTargetUrl(payload.url, payload.host, payload.port);
    },
  );

  ipcMain.handle('devtools-standalone:close-target', () => {
    closeTargetUrl();
  });

  createDevtoolsWindow();
});
