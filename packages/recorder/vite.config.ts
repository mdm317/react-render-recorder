import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const devtoolsApiEntry = fileURLToPath(new URL("../devtools-api/src/index.ts", import.meta.url));

const reactRecordEntry = fileURLToPath(new URL("./src/index.ts", import.meta.url));

export default defineConfig(({ command, mode }) => {
  const isDevelopmentWebMode = command === "serve" || mode === "dev-web";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "devtools-api": devtoolsApiEntry,
      },
    },
    build: isDevelopmentWebMode
      ? {
          outDir: "dist-dev-web",
        }
      : {
          lib: {
            entry: reactRecordEntry,
            fileName: () => "react-record.js",
            formats: ["es"],
          },
          sourcemap: true,
          rollupOptions: {
            external: ["devtools-api"],
          },
        },
  };
});
