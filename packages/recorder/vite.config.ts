import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const reactRenderRecorderEntry = fileURLToPath(new URL("./src/index.ts", import.meta.url));

const RECORDER_UNPKG_URL =
  "https://unpkg.com/react-render-recorder@0.1.0/dist/react-render-recorder.js";

const injectRecorderScript = (mode: string) => ({
  name: "inject-recorder-script",
  transformIndexHtml() {
    if (mode === "app") {
      return [
        {
          tag: "script",
          attrs: { crossorigin: "anonymous", src: RECORDER_UNPKG_URL },
          injectTo: "head" as const,
        },
      ];
    }
    return [
      {
        tag: "script",
        attrs: { type: "module", src: "/src/index.ts" },
        injectTo: "head" as const,
      },
    ];
  },
});

export default defineConfig(({ command, mode }) => {
  const isApp = mode === "app";
  const isLibBuild = command === "build" && !isApp;

  return {
    plugins: [tailwindcss(), react(), injectRecorderScript(mode)],
    base: isApp ? "/react-render-recorder/" : "/",
    define: isLibBuild
      ? {
          "process.env.NODE_ENV": JSON.stringify("production"),
        }
      : undefined,
    build: isApp
      ? {
          outDir: "dist-web",
          emptyOutDir: true,
          sourcemap: true,
        }
      : {
          outDir: "dist",
          lib: {
            entry: reactRenderRecorderEntry,
            name: "ReactRenderRecorder",
            fileName: () => "react-render-recorder.js",
            formats: ["iife"],
          },
          minify: false,
          sourcemap: true,
        },
    test: {
      include: ["src/**/*.test.ts"],
      exclude: ["e2e/**"],
    },
  };
});
