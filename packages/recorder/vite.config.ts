import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const reactRenderRecorderEntry = fileURLToPath(new URL("./src/index.ts", import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    outDir: "dist",
    lib: {
      entry: reactRenderRecorderEntry,
      name: "ReactRenderRecorder",
      fileName: () => "react-render-recorder.js",
      formats: ["iife"],
    },
    sourcemap: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["e2e/**"],
  },
});
