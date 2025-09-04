import "wxt";
import { defineWxtModule } from "wxt/modules";
import type { Plugin, ViteDevServer, ResolvedConfig } from "vite";
import type { IncomingMessage } from "http";

interface LogEntry {
  level: string;
  message: string;
  timestamp: Date;
  url?: string;
  userAgent?: string;
  stacks?: string[];
  extra?: any;
  module?: string;
}

interface ClientLogRequest {
  logs: LogEntry[];
}

export interface ConsoleForwardOptions {
  /**
   * Whether to enable console forwarding (default: true in dev mode only)
   */
  enabled?: boolean;
  /**
   * API endpoint path (default: '/api/debug/client-logs')
   */
  endpoint?: string;
  /**
   * Console levels to forward (default: ['log', 'warn', 'error', 'info', 'debug'])
   */
  levels?: ("log" | "warn" | "error" | "info" | "debug")[];
  /**
   * Entrypoint names to exclude from console forwarding
   * @default []
   */
  excludeEntrypoints?: string[];
  /**
   * Silent on error - don't show console warnings when server is down (default: true)
   */
  silentOnError?: boolean;
  /**
   * Enable forwarding of unhandled errors and promise rejections (default: true)
   */
  forwardErrors?: boolean;
}

export default defineWxtModule<ConsoleForwardOptions>({
  name: "console-forward",
  configKey: "consoleForward",
  async setup(wxt, options = {}) {
    const resolvedOptions: Required<ConsoleForwardOptions> = {
      enabled: wxt.config.mode === "development",
      endpoint: "/api/debug/client-logs",
      levels: ["log", "warn", "error", "info", "debug"],
      excludeEntrypoints: [],
      silentOnError: true,
      forwardErrors: true,
      ...options,
    };

    if (!resolvedOptions.enabled) {
      wxt.logger.info(
        "[console-forward] Module disabled (not in development mode)"
      );
      return;
    }

    wxt.logger.info("[console-forward] Module enabled for development mode");

    // Virtual modules
    const configModuleId = "virtual:console-forward-config";
    const forwardModuleId = "virtual:console-forward";

    // Shared variable to store the actual dev server URL across plugin instances
    let sharedDevServerUrl = "";

    // Create the console forwarding Vite plugin
    const consoleForwardPlugin = (): Plugin => {
      let viteConfig: ResolvedConfig;

      return {
        name: "wxt-console-forward",
        configResolved(config) {
          viteConfig = config;
        },

        configureServer(server) {
          // Immediately capture server configuration
          const serverConfig = (viteConfig?.server ||
            server.config?.server ||
            {}) as {
            host?: string | boolean;
            port?: number;
            https?: boolean;
          };
          const host =
            serverConfig.host === true
              ? "localhost"
              : typeof serverConfig.host === "string"
              ? serverConfig.host
              : "localhost";
          const protocol = serverConfig.https ? "https" : "http";

          // Try to get port from various sources
          let port: number = serverConfig.port || 3000;
          if (!serverConfig.port) {
            // Check if port was passed via command line or process.argv
            const portArg = process.argv.find((arg) =>
              arg.startsWith("--port=")
            );
            if (portArg) {
              const parsedPort = parseInt(portArg.split("=")[1]!, 10);
              if (!isNaN(parsedPort)) {
                port = parsedPort;
              }
            } else {
              const portIndex = process.argv.indexOf("--port");
              if (portIndex !== -1 && process.argv[portIndex + 1]) {
                const parsedPort = parseInt(process.argv[portIndex + 1]!, 10);
                if (!isNaN(parsedPort)) {
                  port = parsedPort;
                }
              }
            }
          }

          sharedDevServerUrl = `${protocol}://${host}:${port}`;
          wxt.logger.info(
            `[console-forward] Initial dev server URL: ${sharedDevServerUrl}`
          );

          // Hook into server startup to confirm/update the URL if needed
          const originalListen = server.listen.bind(server);
          server.listen = function (
            listenPort?: number | string,
            ...args: any[]
          ) {
            const result = originalListen.call(this, listenPort as number, ...args);

            // Update URL if the actual listen port differs
            if (listenPort && listenPort !== port) {
              const actualPort =
                typeof listenPort === "string"
                  ? parseInt(listenPort, 10)
                  : listenPort;
              if (!isNaN(actualPort) && actualPort !== port) {
                port = actualPort;
                sharedDevServerUrl = `${protocol}://${host}:${actualPort}`;
                wxt.logger.info(
                  `[console-forward] Updated dev server URL: ${sharedDevServerUrl}`
                );
              }
            }

            return result;
          };

          // Add middleware for handling console forwarding requests
          server.middlewares.use((req, res, next) => {
            const request = req as IncomingMessage & {
              method?: string;
              url?: string;
            };

            // Debug log to see all incoming requests
            // if (request.url?.includes("debug")) {
            //   console.log(
            //     "[console-forward] Incoming request:",
            //     request.method,
            //     request.url
            //   );
            // }

            // Check if this is our console forwarding endpoint
            if (request.url !== resolvedOptions.endpoint) {
              return next();
            }

            // Set CORS headers
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");

            // Handle OPTIONS preflight
            if (request.method === "OPTIONS") {
              res.writeHead(200);
              res.end();
              return;
            }

            let body = "";
            request.setEncoding("utf8");

            request.on("data", (chunk: string) => {
              body += chunk;
            });

            request.on("end", () => {
              try {
                const { logs }: ClientLogRequest = JSON.parse(body);

                logs.forEach((log) => {
                  const location = log.url ? ` (${log.url})` : "";
                  let message = `[${log.module || "unknown"}] [${log.level}] ${
                    log.message
                  }${location}`;

                  // Add stack traces if available
                  if (log.stacks && log.stacks.length > 0) {
                    message +=
                      "\n" +
                      log.stacks
                        .map((stack) =>
                          stack
                            .split("\n")
                            .map((line) => `    ${line}`)
                            .join("\n")
                        )
                        .join("\n");
                  }

                  // Add extra data if available
                  if (log.extra && log.extra.length > 0) {
                    message +=
                      "\n    Extra data: " +
                      JSON.stringify(log.extra, null, 2)
                        .split("\n")
                        .map((line) => `    ${line}`)
                        .join("\n");
                  }

                  // Use appropriate logger level
                  switch (log.level) {
                    case "error":
                      wxt.logger.error(message);
                      break;
                    case "warn":
                      wxt.logger.warn(message);
                      break;
                    case "info":
                      wxt.logger.info(message);
                      break;
                    case "debug":
                      wxt.logger.debug(message);
                      break;
                    default:
                      wxt.logger.info(message);
                  }
                });

                res.writeHead(200, {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                });
                res.end(JSON.stringify({ success: true }));
              } catch (error) {
                wxt.logger.error(
                  "[console-forward] Error processing client logs:",
                  error
                );
                res.writeHead(400, {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                });
                res.end(JSON.stringify({ error: "Invalid JSON" }));
              }
            });
          });
        },

        resolveId(id) {
          // Handle both direct imports and Vite's /@id/ prefixed imports
          const cleanId = id.replace(/^\/@id\/\\0?/, "");

          if (cleanId === configModuleId || id === configModuleId) {
            return `\0${configModuleId}`;
          }
          if (cleanId === forwardModuleId || id === forwardModuleId) {
            return `\0${forwardModuleId}`;
          }
          return null;
        },

        load(id) {
          if (id === `\0${configModuleId}`) {
            // Use sharedDevServerUrl or provide a fallback
            const devServerEndpoint =
              sharedDevServerUrl || "http://localhost:3000";
            return `
export const DEV_SERVER_ENDPOINT = '${devServerEndpoint}';
export const ENDPOINT_PATH = '${resolvedOptions.endpoint}';
export const SILENT_ON_ERROR = ${resolvedOptions.silentOnError};
export const LEVELS = ${JSON.stringify(resolvedOptions.levels)};
export const FORWARD_ERRORS = ${resolvedOptions.forwardErrors};
            `;
          }

          if (id === `\0${forwardModuleId}`) {
            return `
import { DEV_SERVER_ENDPOINT, ENDPOINT_PATH, SILENT_ON_ERROR, LEVELS, FORWARD_ERRORS } from '${configModuleId}';

// Singleton pattern to prevent duplicate initialization
const CONSOLE_FORWARD_INITIALIZED_KEY = '__wxt_console_forward_initialized__';
let isInitialized = false;

// Module context tracking
let currentModuleContext = 'unknown';

export function setModuleContext(context) {
  currentModuleContext = context;
}

// Check if already initialized
if (typeof window !== 'undefined') {
  isInitialized = window[CONSOLE_FORWARD_INITIALIZED_KEY] === true;
  if (!isInitialized) {
    window[CONSOLE_FORWARD_INITIALIZED_KEY] = true;
  }
}

// Console forwarding implementation
const originalMethods = {};
if (!isInitialized) {
  LEVELS.forEach(level => {
    originalMethods[level] = console[level].bind(console);
  });
}

const logBuffer = [];
let flushTimeout = null;
const FLUSH_DELAY = 100;
const MAX_BUFFER_SIZE = 50;

function createLogEntry(level, args) {
  const stacks = [];
  const extra = [];

  const message = args.map((arg) => {
    if (arg === undefined) return "undefined";
    if (arg === null) return "null";
    if (typeof arg === "string") return arg;
    if (arg instanceof Error || typeof arg.stack === "string") {
      let stringifiedError = arg.toString();
      if (arg.stack) {
        let stack = arg.stack.toString();
        if (stack.startsWith(stringifiedError)) {
          stack = stack.slice(stringifiedError.length).trimStart();
        }
        if (stack) {
          stacks.push(stack);
        }
      }
      return stringifiedError;
    }
    if (typeof arg === "object" && arg !== null) {
      try {
        extra.push(JSON.parse(JSON.stringify(arg)));
      } catch {
        extra.push(String(arg));
      }
      return "[extra#" + extra.length + "]";
    }
    return String(arg);
  }).join(" ");

  // Determine execution context
  let contextInfo = currentModuleContext;
  if (typeof self !== 'undefined' && typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope) {
    contextInfo += ':service-worker';
  } else if (typeof self !== 'undefined' && typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    contextInfo += ':worker';
  } else if (typeof window !== 'undefined') {
    if (window === window.top) {
      contextInfo += ':main-world';
    } else {
      contextInfo += ':iframe';
    }
  } else {
    contextInfo += ':unknown-context';
  }

  return {
    level,
    message,
    timestamp: new Date(),
    url: typeof location !== 'undefined' ? location.href : 'extension-context',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'extension-context',
    module: contextInfo,
    stacks,
    extra,
  };
}

async function sendLogs(logs) {
  try {
    const apiUrl = DEV_SERVER_ENDPOINT + ENDPOINT_PATH;
    await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs }),
    });
  } catch (error) {
    if (!SILENT_ON_ERROR && typeof console !== 'undefined' && originalMethods.warn) {
      originalMethods.warn('[Console Forward] Failed to send logs:', error.message);
    }
  }
}

function flushLogs() {
  if (logBuffer.length === 0) return;
  const logsToSend = [...logBuffer];
  logBuffer.length = 0;
  sendLogs(logsToSend);
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
}

function addToBuffer(entry) {
  logBuffer.push(entry);
  if (logBuffer.length >= MAX_BUFFER_SIZE) {
    flushLogs();
    return;
  }
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushLogs, FLUSH_DELAY);
  }
}

// Patch console methods only if not already initialized
if (!isInitialized) {
  LEVELS.forEach(level => {
    console[level] = function(...args) {
      originalMethods[level](...args);
      const entry = createLogEntry(level, args);
      addToBuffer(entry);
    };
  });
}

// Error forwarding handlers
if (FORWARD_ERRORS && !isInitialized) {
  const isWorker = typeof self !== 'undefined' && typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
  const isServiceWorker = typeof self !== 'undefined' && typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope;
  const hasWindow = typeof window !== 'undefined';

  function formatErrorDetails(error) {
    const details = {
      message: error.message || String(error),
      stack: error.stack || '',
      filename: error.filename || '',
      lineno: error.lineno || 0,
      colno: error.colno || 0,
    };

    if (error.error && typeof error.error === 'object') {
      details.message = error.error.message || details.message;
      details.stack = error.error.stack || details.stack;
    }

    return details;
  }

  function handleUnhandledRejection(event) {
    const errorDetails = event.reason instanceof Error
      ? formatErrorDetails(event.reason)
      : { message: String(event.reason), stack: '' };

    originalMethods.error('[Unhandled Promise Rejection]', errorDetails.message);

    const errorObj = event.reason instanceof Error
      ? event.reason
      : new Error(errorDetails.message);

    const entry = createLogEntry('error', [
      '[Unhandled Promise Rejection]',
      errorObj
    ]);

    addToBuffer(entry);

    if (hasWindow && event.preventDefault) {
      event.preventDefault();
    }
  }

  function handleUncaughtException(event) {
    const errorDetails = formatErrorDetails(event);

    originalMethods.error('[Uncaught Exception]', errorDetails.message);

    const errorObj = new Error(errorDetails.message);
    if (errorDetails.stack) {
      errorObj.stack = errorDetails.stack;
    }

    const entry = createLogEntry('error', [
      '[Uncaught Exception]',
      errorObj,
      errorDetails.filename ? 'at ' + errorDetails.filename + ':' + errorDetails.lineno + ':' + errorDetails.colno : null
    ].filter(Boolean));

    addToBuffer(entry);

    if (hasWindow && event.preventDefault) {
      event.preventDefault();
    }
  }

  if (hasWindow) {
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleUncaughtException);
  } else if (isWorker || isServiceWorker) {
    self.addEventListener('unhandledrejection', handleUnhandledRejection);
    self.addEventListener('error', handleUncaughtException);
  }
}

// Cleanup handlers
if (!isInitialized) {
  if (typeof window !== 'undefined') {
    window.addEventListener("beforeunload", flushLogs);
  }
  setInterval(flushLogs, 10000);
}

export default { flushLogs };
            `;
          }
        },

        transform(code, id) {
          // Skip node_modules
          if (id.includes("node_modules")) return;

          // Check if this entrypoint should be excluded
          const entrypointName = id
            .split("/")
            .pop()
            ?.replace(/\.[^.]+$/, "");
          if (
            entrypointName &&
            resolvedOptions.excludeEntrypoints.includes(entrypointName)
          ) {
            return;
          }

          // Inject into all JS/TS files that aren't already importing the forward module
          if (
            (id.endsWith(".js") ||
              id.endsWith(".ts") ||
              id.endsWith(".tsx") ||
              id.endsWith(".jsx")) &&
            !code.includes(forwardModuleId) &&
            !code.includes('setModuleContext')
          ) {
            const moduleContext = entrypointName || "unknown";
            return (
              `import { setModuleContext } from '${forwardModuleId}';\n` +
              `setModuleContext('${moduleContext}');\n` +
              `import '${forwardModuleId}';\n${code}`
            );
          }
        },

        transformIndexHtml(html, ctx) {
          const entrypointName = ctx.filename
            .split("/")
            .pop()
            ?.replace(/\.[^.]+$/, "");
          if (
            entrypointName &&
            resolvedOptions.excludeEntrypoints.includes(entrypointName)
          ) {
            return;
          }

          // Check if the module is already included in the HTML or if setModuleContext is present
          if (!html.includes(forwardModuleId) && !html.includes('setModuleContext')) {
            const moduleContext = entrypointName || "popup";
            const scriptTag = `<script type="module">
import { setModuleContext } from '/@id/\\0${forwardModuleId}';
setModuleContext('${moduleContext}');
import '/@id/\\0${forwardModuleId}';
</script>`;

            if (html.includes("<head>")) {
              return html.replace("<head>", `<head>\n${scriptTag}`);
            } else if (html.includes("<body>")) {
              return html.replace("<body>", `<body>\n${scriptTag}`);
            } else {
              return scriptTag + "\n" + html;
            }
          }
        },
      };
    };

    // Hook into Vite dev server configuration
    wxt.hooks.hook("vite:devServer:extendConfig", (config) => {
      config.plugins = config.plugins || [];
      config.plugins.push(consoleForwardPlugin());
    });

    // Hook into Vite build configuration (for development mode)
    wxt.hooks.hook("vite:build:extendConfig", (entries, config) => {
      if (wxt.config.mode !== "development") return;
      config.plugins = config.plugins || [];
      config.plugins.push(consoleForwardPlugin());
    });
  },
});

declare module "wxt" {
  export interface InlineConfig {
    consoleForward?: ConsoleForwardOptions;
  }
}
