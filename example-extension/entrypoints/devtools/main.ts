// Create the devtools panel that loads our React panel
chrome.devtools.panels.create(
  "Console Forward Test",
  "/icon/48.png",
  "/devtools-panel.html",
  (panel) => {
    console.log("[DevTools] Panel created:", panel);
  }
);

console.log("[DevTools] DevTools script loaded");
