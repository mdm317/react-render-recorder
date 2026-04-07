import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectDir = dirname(fileURLToPath(import.meta.url));
const workspaceDir = resolve(projectDir, "../..");
const recorderDir = resolve(workspaceDir, "packages/recorder");
const recorderBundlePath = resolve(recorderDir, "dist/react-record.js");
const recorderSourceMapPath = resolve(recorderDir, "dist/react-record.js.map");
const recorderBundlePublicPath = "/packages/recorder/dist/react-record.js";
const recorderSourceMapPublicPath = "/packages/recorder/dist/react-record.js.map";

function buildRecorderBundle() {
  execFileSync("pnpm", ["build"], {
    cwd: recorderDir,
    stdio: "inherit",
  });
}

function recorderBundlePlugin() {
  return {
    name: "recorder-bundle-plugin",
    async buildStart() {
      buildRecorderBundle();
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (req.url === recorderBundlePublicPath) {
            const source = await readFile(recorderBundlePath);
            res.setHeader("Content-Type", "application/javascript; charset=utf-8");
            res.end(source);
            return;
          }

          if (req.url === recorderSourceMapPublicPath) {
            const source = await readFile(recorderSourceMapPath);
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(source);
            return;
          }
        } catch (error) {
          next(error);
          return;
        }

        next();
      });
    },
    async generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "packages/recorder/dist/react-record.js",
        source: await readFile(recorderBundlePath),
      });

      this.emitFile({
        type: "asset",
        fileName: "packages/recorder/dist/react-record.js.map",
        source: await readFile(recorderSourceMapPath),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), recorderBundlePlugin()],
});
