import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: 1,
  use: {
    browserName: "chromium",
    headless: true,
    baseURL: "http://localhost:5173",
    launchOptions: {
      slowMo: 50,
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm run dev",
    cwd: "..",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
