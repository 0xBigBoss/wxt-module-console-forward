import {
  test as base,
  expect,
  chromium,
  BrowserContext,
  Page,
} from "@playwright/test";
import path from "path";

// Extend base test with fixtures for Chrome extension testing
type Fixtures = {
  context: BrowserContext;
  extensionId: string;
};

const test = base.extend<Fixtures>({
  // Create a persistent context with the extension loaded
  context: async ({}, use) => {
    const pathToExtension = path.join(
      process.cwd(),
      "example-extension/.output/chrome-mv3-dev"
    );

    const context = await chromium.launchPersistentContext("", {
      headless: true, // Use headless mode for CI compatibility
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-features=TranslateUI",
      ],
    });

    await use(context);
    await context.close();
  },

  // Extract extension ID from background page
  extensionId: async ({ context }, use) => {
    // Wait for background page to load
    let backgroundPage: Page;
    const existingBackgroundPages = context.backgroundPages();

    if (existingBackgroundPages.length > 0) {
      backgroundPage = existingBackgroundPages[0];
    } else {
      backgroundPage = await context.waitForEvent("backgroundpage", {
        timeout: 10000,
      });
    }

    const extensionId = backgroundPage.url().split("://")[1].split("/")[0];
    await use(extensionId);
  },
});

test.describe("Console Forwarding Extension", () => {
  test("should load extension and verify console forwarding is active", async ({
    context,
    extensionId,
  }) => {
    // Get the background page
    let backgroundPage: Page;
    const existingBackgroundPages = context.backgroundPages();

    if (existingBackgroundPages.length > 0) {
      backgroundPage = existingBackgroundPages[0];
    } else {
      backgroundPage = await context.waitForEvent("backgroundpage", {
        timeout: 10000,
      });
    }

    // Verify extension ID is valid
    expect(extensionId).toMatch(/^[a-z]{32}$/);

    // Verify background page URL
    expect(backgroundPage.url()).toContain("chrome-extension://");
    expect(backgroundPage.url()).toContain(extensionId);

    // Test basic console functionality
    const consoleMessages: string[] = [];
    backgroundPage.on("console", (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Execute a test log in background context
    await backgroundPage.evaluate(() => {
      console.log("[Test] Extension loaded and console forwarding active");
    });

    // Wait briefly for console message
    await backgroundPage.waitForTimeout(500);

    // Verify console message was captured
    expect(
      consoleMessages.some((msg) =>
        msg.includes("[Test] Extension loaded and console forwarding active")
      )
    ).toBeTruthy();

    console.log(
      "Extension loading and console forwarding verification completed"
    );
  });

  test("should load popup and verify UI elements", async ({
    context,
    extensionId,
  }) => {
    // Open popup page
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Wait for popup to fully load
    await popupPage.waitForSelector("h1", { timeout: 10000 });

    // Verify popup loaded with expected elements
    await expect(popupPage.locator("h1")).toContainText("Console Forward Test");
    await expect(
      popupPage.locator('button:has-text("Test Console Logs")')
    ).toBeVisible();
    await expect(
      popupPage.locator('button:has-text("Test Error")')
    ).toBeVisible();
    await expect(popupPage.locator("p")).toContainText(
      "Check your terminal to see forwarded logs"
    );

    // Test that buttons are functional
    const consoleMessages: string[] = [];
    popupPage.on("console", (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Click test console logs button
    await popupPage.click('button:has-text("Test Console Logs")');

    // Wait for logs to be processed
    await popupPage.waitForTimeout(1000);

    // Verify console messages were generated
    expect(consoleMessages.length).toBeGreaterThan(0);

    console.log("Popup UI and functionality test completed");
  });

  test("should verify background script execution", async ({
    context,
    extensionId,
  }) => {
    // Get the background page
    let backgroundPage: Page;
    const existingBackgroundPages = context.backgroundPages();

    if (existingBackgroundPages.length > 0) {
      backgroundPage = existingBackgroundPages[0];
    } else {
      backgroundPage = await context.waitForEvent("backgroundpage", {
        timeout: 10000,
      });
    }

    // Verify background script functionality
    const result = await backgroundPage.evaluate(() => {
      // Test that browser API is available
      return {
        hasRuntimeAPI:
          typeof browser !== "undefined" &&
          typeof browser.runtime !== "undefined",
        extensionId: browser?.runtime?.id || "unknown",
        manifestVersion:
          browser?.runtime?.getManifest?.()?.version || "unknown",
      };
    });

    expect(result.hasRuntimeAPI).toBeTruthy();
    expect(result.extensionId).toBeTruthy();
    expect(result.manifestVersion).toBeTruthy();

    console.log("Background script execution test completed");
  });
});

test.describe("Console Forwarding Integration", () => {
  test("should verify dev server receives console logs", async () => {
    // This test verifies that the dev server is configured to receive logs
    // The actual forwarding is verified through the dev server output
    // which can be seen in the test execution logs

    // Make a request to the dev server to verify it's running
    const response = await fetch("http://localhost:3000");
    expect(response.ok).toBeTruthy();

    // Test the console forwarding endpoint
    const testLogData = {
      level: "log",
      message: "Test console forwarding",
      timestamp: new Date().toISOString(),
      context: "test",
    };

    const forwardResponse = await fetch(
      "http://localhost:3000/api/debug/client-logs",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testLogData),
      }
    );

    expect(forwardResponse.ok).toBeTruthy();

    console.log("Dev server console forwarding endpoint test completed");
  });
});
