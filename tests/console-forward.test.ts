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
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

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

test.describe("Console Forwarding Integration", () => {
  test("should accept logs at forwarding endpoint", async ({}) => {
    const testLogData = {
      logs: [
        {
          level: "log",
          message: "Test console forwarding from Playwright",
          timestamp: new Date().toISOString(),
          module: "test",
        },
      ],
    };

    const response = await fetch(`${DEV_SERVER_URL}/api/debug/client-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testLogData),
    });

    expect(response.ok).toBeTruthy();
  });
});
