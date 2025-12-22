import React, { StrictMode, useState, useEffect, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";

// Test component that uses React hooks - this will trigger the bug if React
// is bundled twice due to module resolution issues from console-forward
function DevToolsPanel() {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  // useLayoutEffect is particularly sensitive to React instance mismatches
  useLayoutEffect(() => {
    console.log("[DevToolsPanel] useLayoutEffect - component mounted");
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log("[DevToolsPanel] useEffect - count changed:", count);
  }, [count]);

  return (
    <div>
      <h1>DevTools Panel (React)</h1>
      <p>Status: {mounted ? "Mounted" : "Loading..."}</p>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
      <button
        onClick={() => {
          console.log("[DevToolsPanel] Test log from React component");
          console.warn("[DevToolsPanel] Test warning");
          console.error("[DevToolsPanel] Test error");
        }}
      >
        Test Console Logs
      </button>
    </div>
  );
}

function App() {
  return (
    <StrictMode>
      <DevToolsPanel />
    </StrictMode>
  );
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(<App />);

console.log("[DevToolsPanel] React app rendered");
