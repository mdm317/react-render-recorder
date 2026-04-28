import { clipboard, contextBridge, ipcRenderer, shell } from 'electron';
import * as fs from 'fs';

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

contextBridge.exposeInMainWorld('api', {
  electron: { clipboard, shell },

  getDevTools() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('react-devtools-core/standalone').default;
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(
        (err as Error).toString() +
          '\n\nDid you install dependencies in packages/devtools-standalone?',
      );
      return null;
    }
  },

  readEnv(): EnvOptions {
    let options: EnvOptions['options'];
    let useHttps = false;
    try {
      if (process.env.KEY && process.env.CERT) {
        options = {
          key: fs.readFileSync(process.env.KEY),
          cert: fs.readFileSync(process.env.CERT),
        };
        useHttps = true;
      }
    } catch (err) {
      console.error('Failed to process SSL options - ', err);
      options = undefined;
    }

    const host = process.env.HOST || 'localhost';
    const protocol: 'http' | 'https' = useHttps ? 'https' : 'http';
    const port =
      Number(process.env.REACT_DEVTOOLS_PORT) ||
      Number(process.env.PORT) ||
      8097;
    const path = process.env.REACT_DEVTOOLS_PATH || undefined;
    const clientHost = process.env.REACT_DEVTOOLS_CLIENT_HOST || undefined;
    const clientPort = process.env.REACT_DEVTOOLS_CLIENT_PORT
      ? Number(process.env.REACT_DEVTOOLS_CLIENT_PORT)
      : undefined;
    const clientUseHttps =
      process.env.REACT_DEVTOOLS_CLIENT_USE_HTTPS === 'true' ? true : undefined;

    return {
      options,
      useHttps,
      host,
      protocol,
      port,
      path,
      clientHost,
      clientPort,
      clientUseHttps,
    };
  },

  openTarget(url: string, host: string, port: number): Promise<void> {
    return ipcRenderer.invoke('devtools-standalone:open-target', {
      url,
      host,
      port,
    });
  },

  closeTarget(): Promise<void> {
    return ipcRenderer.invoke('devtools-standalone:close-target');
  },
});
