import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["wxt-module-console-forward"],
  consoleForward: {
    enabled: true,
    endpoint: "/api/debug/client-logs",
    levels: ["log", "warn", "error", "info", "debug"],
    excludeEntrypoints: [],
    silentOnError: false,
    forwardErrors: true,
  },
  dev: {
    server: {
      port: 5175,
    },
  },
});
