import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "devtools-api": fileURLToPath(
        new URL("../devtools-api/src/index.ts", import.meta.url),
      ),
    },
  },
  build: {
    lib: {
      entry: {
        "react-record": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
        devtools: fileURLToPath(new URL("./src/devtools.ts", import.meta.url)),
      },
      fileName: (_format, entryName) => `${entryName}.js`,
      formats: ["es"],
    },
    sourcemap: true,
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
  },
});
