import { defineConfig } from "@playwright/test";

const isCI = !!process.env.CI;
const isDebug = !!process.env.PWDEBUG || !!process.env.DEBUG;

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    browserName: "chromium",
    headless: true,
    baseURL: "http://localhost:5173",
    launchOptions: isDebug ? { slowMo: 50 } : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm run dev",
    cwd: "..",
    url: "http://localhost:5173",
    reuseExistingServer: !isCI,
    timeout: 30_000,
  },
});
