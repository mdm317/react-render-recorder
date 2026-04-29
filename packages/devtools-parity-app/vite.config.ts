import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const compareRoot = fileURLToPath(new URL("./src/compare", import.meta.url));

export default defineConfig({
  root: compareRoot,
  plugins: [react()],
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("./dist/compare", import.meta.url)),
    emptyOutDir: true,
    sourcemap: true,
    target: "chrome120",
  },
});
