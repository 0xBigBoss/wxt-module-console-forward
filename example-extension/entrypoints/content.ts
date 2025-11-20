import debugBase from "debug";

// Enable debug module for this namespace
debugBase.enable("extension:*");

const debug = debugBase("extension:content");

export default defineContentScript({
  matches: ["*://*/*"], // Match all websites for easier testing
  main() {
    debug("Content script started on: %s", window.location.href);
    console.log("[Content] Content script started on:", window.location.href);
    console.info("[Content] Document ready state:", document.readyState);
    console.warn("[Content] This is a warning from content script");
    console.error("[Content] This is an error from content script");

    // Test object logging
    const pageInfo = {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 50) + "...",
      elements: {
        total: document.querySelectorAll("*").length,
        images: document.images.length,
        links: document.links.length,
      },
    };

    console.log("[Content] Page info:", pageInfo);
    debug("Page info with debug module: %O", pageInfo);

    // Test DOM interaction
    setTimeout(() => {
      console.log(
        "[Content] DOM fully loaded, element count:",
        document.querySelectorAll("*").length
      );

      // Test periodic logging
      let contentCounter = 0;
      const contentInterval = setInterval(() => {
        contentCounter++;
        console.log(
          `[Content] Periodic content log #${contentCounter} - Scroll Y: ${window.scrollY}`
        );
        debug(
          `Periodic content debug log #${contentCounter} - Scroll Y: ${window.scrollY}`
        );

        if (contentCounter >= 3) {
          clearInterval(contentInterval);
          console.log("[Content] Content periodic logging completed");
          debug("Content periodic logging completed (from debug module)");
        }
      }, 3000);
    }, 1000);

    // Test event logging
    let clickCount = 0;
    document.addEventListener("click", (event) => {
      clickCount++;
      if (clickCount <= 5) {
        const clickInfo = {
          tag: event.target?.tagName,
          id: event.target?.id,
          className: event.target?.className,
          position: { x: event.clientX, y: event.clientY },
        };
        console.log(`[Content] Click #${clickCount} on:`, clickInfo);
        debug(`Click #${clickCount} on: %O`, clickInfo);
      }
    });

    console.log("[Content] Content script initialization complete");
    debug("Content script initialization complete (from debug module)");
  },
});
