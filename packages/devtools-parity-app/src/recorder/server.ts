import * as fs from "fs";
import * as http from "http";
import type { AddressInfo } from "net";
import { resolve } from "path";

// __dirname at runtime: dist/recorder
// →  ../../../recorder/dist/react-render-recorder.js  (siblings under packages/)
const RECORDER_BUNDLE_PATH = resolve(
  __dirname,
  "..",
  "..",
  "..",
  "recorder",
  "dist",
  "react-render-recorder.js",
);
const RECORDER_BUNDLE_NAME = "react-render-recorder.js";

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

export function startReactRenderRecordServer(): Promise<string | null> {
  return new Promise((resolveOrigin) => {
    const server = http.createServer((req, res) => {
      const bundle = readRecorderBundle();
      if (bundle == null) {
        res.writeHead(503, { "Content-Type": "text/plain" });
        res.end("recorder bundle not available");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
      });
      res.end(bundle);
    });

    server.on("error", (err) => {
      console.error("[devtools-parity-app] recorder server error:", err);
      resolveOrigin(null);
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      const origin = `http://127.0.0.1:${addr.port}`;
      recorderServerOrigin = origin;
      console.log(
        `[devtools-parity-app] recorder bundle served at ${origin}/${RECORDER_BUNDLE_NAME}`,
      );
      resolveOrigin(origin);
    });
  });
}

// Returns the full URL of the recorder bundle, or null if the server hasn't
// started yet.
export function getRecorderBundleUrl(): string | null {
  if (recorderServerOrigin == null) return null;
  return `${recorderServerOrigin}/${RECORDER_BUNDLE_NAME}`;
}
