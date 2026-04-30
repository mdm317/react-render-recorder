type EnvOptions = {
  options: { key: Buffer; cert: Buffer } | undefined;
  useHttps: boolean;
  host: string;
  protocol: 'http' | 'https';
  port: number;
  path: string | undefined;
  clientHost: string | undefined;
  clientPort: number | undefined;
  clientUseHttps: boolean | undefined;
};

type DevToolsApi = {
  setContentDOMNode: (el: HTMLElement) => DevToolsApi;
  setStatusListener: (cb: (status: string) => void) => DevToolsApi;
  setDisconnectedCallback: (cb: () => void) => DevToolsApi;
  openProfiler: () => DevToolsApi;
  startServer: (
    port: number,
    host: string,
    httpsOptions?: { key: Buffer; cert: Buffer },
    loggerOptions?: unknown,
    path?: string,
    clientOverrides?: {
      host?: string;
      port?: number;
      useHttps?: boolean;
    },
  ) => unknown;
};

type WindowApi = {
  electron: { clipboard: unknown; shell: unknown };
  getDevTools: () => DevToolsApi | null;
  readEnv: () => EnvOptions;
  openTarget: (url: string, host: string, port: number) => Promise<void>;
  closeTarget: () => Promise<void>;
  openCompare: () => Promise<void>;
  fetchComparison: () => Promise<unknown>;
  recorderStart: () => Promise<{ ok: boolean; error: string | null }>;
  recorderEnd: () => Promise<{ ok: boolean; error: string | null }>;
  profilerStart: () => Promise<{ ok: boolean; error: string | null }>;
  profilerStop: () => Promise<{ ok: boolean; error: string | null }>;
};

declare global {
  interface Window {
    api: WindowApi;
  }
}

const api = window.api;
const env = api.readEnv();

const container = document.getElementById('container') as HTMLElement;
const statusEl = document.getElementById('server-status') as HTMLElement;
const waitingEl = document.getElementById('waiting') as HTMLElement | null;
const urlInput = document.getElementById('url-input') as HTMLInputElement;
const openButton = document.getElementById('open-button') as HTMLButtonElement;
const closeButton = document.getElementById(
  'close-button',
) as HTMLButtonElement;
const compareButton = document.getElementById(
  'compare-button',
) as HTMLButtonElement;

function setStatus(text: string) {
  statusEl.textContent = text;
}

const devtools = api.getDevTools();

if (devtools) {
  devtools
    .setContentDOMNode(container)
    .setStatusListener(setStatus)
    .setDisconnectedCallback(() => {
      if (waitingEl) waitingEl.style.display = '';
    })
    .startServer(
      env.port,
      env.host,
      env.options,
      undefined,
      env.path,
      {
        host: env.clientHost,
        port: env.clientPort,
        useHttps: env.clientUseHttps,
      },
    );
} else {
  setStatus('DevTools failed to load');
}

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

async function handleOpen() {
  const url = normalizeUrl(urlInput.value);
  if (!url) {
    urlInput.focus();
    return;
  }
  openButton.disabled = true;
  try {
    await api.openTarget(url, env.host, env.port);
    closeButton.disabled = false;
  } catch (err) {
    console.error('Failed to open target URL', err);
  } finally {
    openButton.disabled = false;
  }
}

async function handleClose() {
  closeButton.disabled = true;
  try {
    await api.closeTarget();
  } catch (err) {
    console.error('Failed to close target window', err);
  }
}

openButton.addEventListener('click', handleOpen);
closeButton.addEventListener('click', handleClose);
compareButton.addEventListener('click', () => {
  void api.openCompare().catch((err) => {
    console.error('Failed to open comparison window', err);
  });
});
urlInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    void handleOpen();
  }
});

export {};
