import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const devtoolsApiEntry = fileURLToPath(new URL("../devtools-api/src/index.ts", import.meta.url));
const reactRecordAutoEntry = fileURLToPath(new URL("./src/index.ts", import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "devtools-api": devtoolsApiEntry,
    },
  },
  build: {
    outDir: "dist",
    lib: {
      entry: reactRecordAutoEntry,
      name: "ReactRecord",
      fileName: () => "react-record.auto.js",
      formats: ["iife"],
    },
    sourcemap: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["e2e/**"],
  },
});
