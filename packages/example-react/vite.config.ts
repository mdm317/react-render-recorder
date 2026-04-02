import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^devtools-api$/,
        replacement: fileURLToPath(
          new URL("../devtools-api/src/index.ts", import.meta.url),
        ),
      },
      {
        find: /^react-record\/devtools$/,
        replacement: fileURLToPath(
          new URL("../react-record/src/devtools.ts", import.meta.url),
        ),
      },
      {
        find: /^react-record$/,
        replacement: fileURLToPath(
          new URL("../react-record/src/index.ts", import.meta.url),
        ),
      },
    ],
  },
});
