import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "path";

// Control headed/headless mode via HEADED env var or --headed flag
const isHeaded = process.env.HEADED === "1" || process.env.HEADED === "true";

export type TestFixtures = {
  context: BrowserContext;
  extensionId: string;
};

export const test = base.extend<TestFixtures>({
  context: async ({}, use) => {
    const pathToExtension = path.join(
      process.cwd(),
      "example-extension/.output/chrome-mv3-dev"
    );

    const args = [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      "--no-first-run",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
    ];

    // Add headless=new flag for headless mode (required for extensions)
    if (!isHeaded) {
      args.unshift("--headless=new");
    }

    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      headless: !isHeaded,
      args,
    });

    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // For MV3 extensions, get extension ID from service worker
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker", {
        timeout: 30000,
      });
    }

    const extensionId = serviceWorker.url().split("/")[2];
    await use(extensionId);
  },
});

export const expect = test.expect;
