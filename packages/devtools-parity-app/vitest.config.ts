import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/windows/compare/app/**/*.test.{ts,tsx}"],
  },
});
