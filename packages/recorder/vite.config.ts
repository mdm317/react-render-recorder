import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const devtoolsApiEntry = fileURLToPath(
  new URL("../devtools-api/src/index.ts", import.meta.url),
);

const reactRecordEntry = fileURLToPath(new URL("./src/index.ts", import.meta.url));
const reactRecordDevtoolsEntry = fileURLToPath(
  new URL("./src/devtools.ts", import.meta.url),
);

export default defineConfig(({ command, mode }) => {
  const isDemoMode = command === "serve" || mode === "demo";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "devtools-api": devtoolsApiEntry,
      },
    },
    build: isDemoMode
      ? {
          outDir: "dist-demo",
        }
      : {
          lib: {
            entry: {
              "react-record": reactRecordEntry,
              devtools: reactRecordDevtoolsEntry,
            },
            fileName: (_format, entryName) => `${entryName}.js`,
            formats: ["es"],
          },
          sourcemap: true,
          rollupOptions: {
            external: ["react", "react-dom", "react/jsx-runtime"],
          },
        },
  };
});
