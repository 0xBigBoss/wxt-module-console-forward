import type { BrowserContext } from "@playwright/test";
import { test, expect } from "./fixtures";

const DEV_SERVER_PORT = 5175;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

test.describe("Console Forwarding Extension", () => {
  test("should load extension and get valid extension ID", async ({
    context,
    extensionId,
  }) => {
    // Verify extension ID is valid (32 lowercase letters)
    expect(extensionId).toMatch(/^[a-z]{32}$/);

    // Verify service worker is running
    const serviceWorkers = context.serviceWorkers();
    expect(serviceWorkers.length).toBeGreaterThan(0);

    const swUrl = serviceWorkers[0].url();
    expect(swUrl).toContain("chrome-extension://");
    expect(swUrl).toContain(extensionId);
  });

  test("should load popup and verify UI elements", async ({
    context,
    extensionId,
  }) => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForLoadState("domcontentloaded");
    await popupPage.waitForFunction(
      () => document.querySelector("#app")?.childElementCount,
      undefined,
      { timeout: 10000 }
    );

    // Verify popup loaded with expected elements using resilient locators
    await expect(popupPage.getByRole("heading", { level: 1 })).toContainText(
      "Console Forward Test"
    );
    await expect(
      popupPage.getByRole("button", { name: /test console logs/i })
    ).toBeVisible();
    await expect(
      popupPage.getByRole("button", { name: /test error/i })
    ).toBeVisible();
    await expect(
      popupPage.getByText("Check your terminal to see forwarded logs")
    ).toBeVisible();
  });

  test("should trigger console logs from popup", async ({
    context,
    extensionId,
  }) => {
    const endpointUrl = `${DEV_SERVER_URL}${ENDPOINT_PATH}`;
    await interceptForwardedLogs(context, endpointUrl, () => {});

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForLoadState("domcontentloaded");
    await popupPage.waitForFunction(
      () => document.querySelector("#app")?.childElementCount,
      undefined,
      { timeout: 10000 }
    );
    await expect(
      popupPage.getByRole("button", { name: /test console logs/i })
    ).toBeVisible();

    const consoleMessages: string[] = [];
    popupPage.on("console", (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Click test console logs button
    await popupPage.getByRole("button", { name: /test console logs/i }).click();

    // Wait for logs to be processed
    await popupPage.waitForTimeout(1000);

    // Verify console messages were generated
    expect(consoleMessages.length).toBeGreaterThan(0);
  });

  test("should verify service worker has browser API access", async ({
    context,
    extensionId,
  }) => {
    // Get the service worker
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker", {
        timeout: 10000,
      });
    }

    // Verify service worker has access to browser APIs
    const result = await serviceWorker.evaluate(() => {
      // Test that browser API is available in service worker context
      const hasBrowserRuntime =
        typeof self !== "undefined" &&
        "chrome" in self &&
        typeof (self as unknown as { chrome: { runtime?: unknown } }).chrome
          .runtime !== "undefined";
      return {
        hasBrowserRuntime,
        url: self.location.href,
      };
    });

    expect(result.hasBrowserRuntime).toBeTruthy();
    expect(result.url).toContain(extensionId);
  });
});

const ENDPOINT_PATH = "/api/debug/client-logs";

async function interceptForwardedLogs(
  context: BrowserContext,
  endpointUrl: string,
  onLogs: (logs: any[]) => void
) {
  // Match both explicit endpoint and any host variations
  await context.route("**/api/debug/client-logs", async (route) => {
    const body = route.request().postData();
    if (body) {
      try {
        const parsed = JSON.parse(body);
        if (Array.isArray(parsed.logs)) {
          onLogs(parsed.logs);
        }
      } catch {
        // ignore malformed payloads
      }
    }

    // Let the request hit the dev server so the normal logging pipeline still runs
    await route.continue();
  });

  const requestListener = async (request: any) => {
    if (!request.url().includes("/api/debug/client-logs")) return;
    const body = request.postData();
    if (!body) return;
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed.logs)) {
        onLogs(parsed.logs);
      }
    } catch {
      // ignore
    }
  };

  context.on("request", requestListener);
  context.once("close", () => {
    context.off("request", requestListener);
  });
}

test.describe("Console Forwarding Integration", () => {
  test("should accept logs at forwarding endpoint", async ({ context }) => {
    const endpointUrl = `${DEV_SERVER_URL}${ENDPOINT_PATH}`;
    const received: any[] = [];

    await interceptForwardedLogs(context, endpointUrl, (logs) =>
      received.push(...logs)
    );

    const page = await context.newPage();
    await page.goto("about:blank");
    await page.evaluate(async ({ url, payload }) => {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }, {
      url: endpointUrl,
      payload: {
        logs: [
          {
            level: "log",
            message: "Test console forwarding from Playwright",
            timestamp: new Date().toISOString(),
            module: "test",
          },
        ],
      },
    });

    await expect
      .poll(() => received.length > 0, { timeout: 5000 })
      .toBeTruthy();
    expect(received[0].message).toContain(
      "Test console forwarding from Playwright"
    );
  });
});

test.describe("React Iframe Context (devtools panel)", () => {
  test("should render React devtools panel without Invalid hook call errors", async ({
    context,
    extensionId,
  }) => {
    // This test verifies the fix for React "Invalid hook call" errors in iframe contexts
    // The bug occurred when console-forward's transform hook prepended imports to entry files,
    // which changed Vite's module resolution order and caused React to be bundled twice

    const devtoolsPanelPage = await context.newPage();
    const errors: string[] = [];

    // Capture any console errors, especially React hook errors
    devtoolsPanelPage.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Capture page errors (uncaught exceptions)
    devtoolsPanelPage.on("pageerror", (error) => {
      errors.push(error.message);
    });

    // Navigate to the devtools panel which uses React with hooks
    await devtoolsPanelPage.goto(
      `chrome-extension://${extensionId}/devtools-panel.html`
    );
    await devtoolsPanelPage.waitForLoadState("domcontentloaded");

    // Wait for React to render - the component sets "Mounted" status via useLayoutEffect
    await expect(devtoolsPanelPage.getByText("Status: Mounted")).toBeVisible({
      timeout: 10000,
    });

    // Verify the React component rendered correctly
    await expect(
      devtoolsPanelPage.getByRole("heading", { name: /DevTools Panel/i })
    ).toBeVisible();
    await expect(devtoolsPanelPage.getByText(/Count: \d+/)).toBeVisible();

    // Test that React hooks still work - click the increment button
    await devtoolsPanelPage.getByRole("button", { name: /Increment/i }).click();
    await expect(devtoolsPanelPage.getByText("Count: 1")).toBeVisible();

    // Verify no React hook errors occurred
    const hookErrors = errors.filter(
      (e) =>
        e.includes("Invalid hook call") ||
        e.includes("useLayoutEffect") ||
        e.includes("Cannot read properties of null")
    );
    expect(hookErrors).toHaveLength(0);
  });
});

test.describe("Console Forwarding End-to-End", () => {
  type ForwardedLog = {
    level: string;
    message: string;
    module?: string;
  };

  test("should forward background and content logs to dev server (UI pages skipped)", async ({
    context,
    extensionId,
  }) => {
    const endpointUrl = `${DEV_SERVER_URL}${ENDPOINT_PATH}`;
    const serverEndpoint = endpointUrl.replace("localhost", "127.0.0.1");
    const forwardedLogs: ForwardedLog[] = [];
    const seenRequests: number[] = [];

    await interceptForwardedLogs(context, endpointUrl, (logs) => {
      forwardedLogs.push(...logs);
      seenRequests.push(logs.length);
    });

    // Clear any previously captured logs on the dev server
    await context.request.delete(serverEndpoint);

    // Trigger fresh background logs to ensure they are forwarded after capture hook is registered
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker", {
        timeout: 10000,
      });
    }

    await serviceWorker.evaluate(() => {
      console.log("[Background] Manual log to verify forwarding");
      console.error("[Background] Manual error to verify forwarding");
    });

    // Trigger content script logging on a real page
    const contentPage = await context.newPage();
    await contentPage.goto("https://example.com");
    await contentPage.waitForLoadState("load");
    await expect(
      contentPage.getByRole("heading", { name: /example domain/i })
    ).toBeVisible();
    await contentPage.click("body");

    const hasLogWith = (predicate: (log: ForwardedLog) => boolean) =>
      forwardedLogs.some(predicate);

    await expect
      .poll(() => forwardedLogs.length, { timeout: 15000 })
      .toBeGreaterThan(0);
    console.log("Forwarded logs sample", forwardedLogs.slice(0, 5));
    const moduleCounts = forwardedLogs.reduce<Record<string, number>>((acc, log) => {
      const key = log.module || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    console.log("Forwarded module counts", moduleCounts);

    const fetchServerLogs = async () => {
      const response = await context.request.get(serverEndpoint);
      if (!response.ok) return [];
      const data = (await response.json()) as { logs?: ForwardedLog[] };
      return data.logs ?? [];
    };

    await expect
      .poll(async () => (await fetchServerLogs()).length, { timeout: 20000 })
      .toBeGreaterThan(0);

    const serverLogs = await fetchServerLogs();
    const allLogs = [...forwardedLogs, ...(serverLogs || [])];

    const hasLogWithAny = (predicate: (log: ForwardedLog) => boolean) =>
      allLogs.some(predicate);

    // Background logs should be forwarded (single-file entrypoint)
    await expect.poll(
      () =>
        hasLogWithAny(
          (log) =>
            log.message.toLowerCase().includes("background") ||
            log.module?.toLowerCase().includes("background")
        ),
      {
        timeout: 15000,
      }
    ).toBeTruthy();

    // Content logs should be forwarded (single-file entrypoint)
    await expect.poll(
      () =>
        hasLogWithAny(
          (log) =>
            log.module?.toLowerCase().includes("content") ||
            log.message.toLowerCase().includes("content script")
        ),
      {
        timeout: 15000,
      }
    ).toBeTruthy();
  });

  test("should NOT forward popup logs (UI pages are skipped to prevent React issues)", async ({
    context,
    extensionId,
  }) => {
    const endpointUrl = `${DEV_SERVER_URL}${ENDPOINT_PATH}`;
    const serverEndpoint = endpointUrl.replace("localhost", "127.0.0.1");
    const forwardedLogs: ForwardedLog[] = [];

    await interceptForwardedLogs(context, endpointUrl, (logs) => {
      forwardedLogs.push(...logs);
    });

    // Clear any previously captured logs on the dev server
    await context.request.delete(serverEndpoint);

    // Open popup and generate logs
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForLoadState("domcontentloaded");
    await popupPage.waitForFunction(
      () => document.querySelector("#app")?.childElementCount,
      undefined,
      { timeout: 10000 }
    );

    // Generate popup logs via evaluate (browser console)
    await popupPage.evaluate(() => {
      console.log("[Popup] E2E log that should NOT be forwarded");
      console.error("[Popup] E2E error that should NOT be forwarded");
    });

    // Wait a bit to allow any potential forwarding
    await popupPage.waitForTimeout(2000);

    const fetchServerLogs = async () => {
      const response = await context.request.get(serverEndpoint);
      if (!response.ok) return [];
      const data = (await response.json()) as { logs?: ForwardedLog[] };
      return data.logs ?? [];
    };

    const serverLogs = await fetchServerLogs();
    const allLogs = [...forwardedLogs, ...(serverLogs || [])];

    // Popup logs should NOT be forwarded (UI pages are skipped)
    const hasPopupLogs = allLogs.some(
      (log) =>
        (log.message.toLowerCase().includes("popup") &&
          log.message.toLowerCase().includes("e2e")) ||
        log.module?.toLowerCase().includes("popup")
    );

    expect(hasPopupLogs).toBe(false);
  });
});
