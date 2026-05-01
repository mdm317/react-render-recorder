import { BrowserWindow } from "electron";
import { join, resolve } from "path";

let compareWindow: BrowserWindow | null = null;

export function createComparisonWindow(): void {
  if (compareWindow && !compareWindow.isDestroyed()) {
    compareWindow.focus();
    return;
  }

  compareWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    title: "Recorder ↔ DevTools Comparison",
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      preload: join(__dirname, "..", "..", "preload.js"),
    },
  });

  const htmlPath = resolve(__dirname, "app", "index.html");
  compareWindow.loadFile(htmlPath);

  compareWindow.on("closed", () => {
    compareWindow = null;
  });
}
