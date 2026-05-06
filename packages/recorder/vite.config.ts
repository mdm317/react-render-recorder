import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const reactRenderRecorderEntry = fileURLToPath(new URL("./src/index.ts", import.meta.url));

export default defineConfig(({ mode }) => {
  const isApp = mode === "app";

  return {
    plugins: [tailwindcss(), react()],
    base: isApp ? "/react-render-recorder/" : "/",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
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
