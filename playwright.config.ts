import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["html"], ["list"]] : "list",
  timeout: 60000,
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // Extension tests use custom fixtures that handle browser launch
  // No projects needed - fixtures.ts handles chromium.launchPersistentContext
  webServer: {
    command:
      "cd example-extension && bun x wxt clean && bun run dev -- --port 5175 --host 127.0.0.1",
    port: 5175,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 60000,
  },
});
