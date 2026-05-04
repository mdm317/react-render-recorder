import { BrowserWindow, shell } from "electron";
import { join, resolve } from "path";

let devtoolsWindow: BrowserWindow | null = null;

export function getDevtoolsWindow(): BrowserWindow | null {
  return devtoolsWindow;
}

export function createDevtoolsWindow(): BrowserWindow {
  devtoolsWindow = new BrowserWindow({
    width: 960,
    height: 720,
    title: "React DevTools (Standalone)",
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      preload: join(__dirname, "..", "..", "preload.js"),
    },
  });

  devtoolsWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  devtoolsWindow.loadFile(resolve(__dirname, "app", "index.html"));

  devtoolsWindow.on("closed", () => {
    devtoolsWindow = null;
  });

  return devtoolsWindow;
}
