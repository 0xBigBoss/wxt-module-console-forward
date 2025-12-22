import type { IncomingMessage } from "http";
import type { Plugin } from "vite";
import MagicString from "magic-string";
import "wxt";
import { defineWxtModule } from "wxt/modules";
import {
  formatMessageWithANSI,
  hasFormatSpecifiers,
} from "./format-specifiers";

/**
 * UI HTML page entrypoint names that should be skipped for console forwarding.
 * These render in browser extension iframes (popup, options, devtools panels, etc.)
 * and prepending imports can cause React module resolution issues.
 *
 * Note: WXT only treats these as UI pages when they're HTML files or directories
 * containing HTML. Single JS/TS files like `popup.ts` are unlisted-script type.
 */
const UI_PAGE_ENTRYPOINT_NAMES = new Set([
  "popup",
  "options",
  "devtools",
  "sidepanel",
  "newtab",
  "history",
  "bookmarks",
  "sandbox",
]);

/**
 * Suffixes for named UI page entrypoints (e.g., "named.sidepanel", "settings.sandbox")
 */
const UI_PAGE_ENTRYPOINT_SUFFIXES = [".sidepanel", ".sandbox"];

/**
 * File extensions to strip when extracting entrypoint directory names.
 * Includes all extensions WXT supports for entrypoints.
 */
const ENTRYPOINT_EXTENSIONS_PATTERN =
  /\.(ts|tsx|js|jsx|html|css|scss|less|sass|styl|stylus)$/;

/**
 * Parses a relative path (after entrypoints/) into entrypoint info.
 * Internal helper shared by getWxtEntrypointInfo for both full paths and URL-style paths.
 */
function parseRelativePath(
  relativePath: string
): { name: string; dirName: string; isInSubdirectory: boolean } {
  // Split into path segments
  const segments = relativePath.split(/[/\\]/);

  // Get the first segment (directory name or single filename)
  const firstSegment = segments[0];

  // Determine if this is a directory-based entrypoint (has subdirectory)
  // e.g., "popup/main.tsx" vs "popup.ts"
  const isInSubdirectory = segments.length > 1;

  // For single-file entrypoints, remove the file extension but keep type suffixes
  // e.g., "overlay.content.ts" → "overlay.content", "popup.html" → "popup"
  const dirName = firstSegment.replace(ENTRYPOINT_EXTENSIONS_PATTERN, "");

  // WXT entrypoint name: first segment before any . or / or \
  // This mirrors WXT's getEntrypointName logic
  const name = relativePath.split(/[./\\]/, 2)[0];

  return { name: name || dirName, dirName, isInSubdirectory };
}

/**
 * Extracts WXT entrypoint info from a file path.
 * Returns the entrypoint name (for logging), directory name (for type detection),
 * and whether this is a directory-based entrypoint.
 *
 * Handles both:
 * - Full file system paths (build mode): /project/entrypoints/popup/main.ts
 * - URL-style paths (Vite dev server): /entrypoints/popup/main.tsx
 *
 * @param filePath - The file path to analyze
 * @param entrypointsDir - The entrypoints directory path (from wxt.config.entrypointsDir)
 *
 * @example
 * getWxtEntrypointInfo("/project/entrypoints/popup/main.ts", "/project/entrypoints")
 * // → { name: "popup", dirName: "popup", isInSubdirectory: true }
 *
 * getWxtEntrypointInfo("/project/entrypoints/popup.ts", "/project/entrypoints")
 * // → { name: "popup", dirName: "popup", isInSubdirectory: false }
 *
 * // URL-style path from Vite dev server
 * getWxtEntrypointInfo("/entrypoints/popup/main.tsx", "/project/entrypoints")
 * // → { name: "popup", dirName: "popup", isInSubdirectory: true }
 */
export function getWxtEntrypointInfo(
  filePath: string,
  entrypointsDir: string
): { name: string; dirName: string; isInSubdirectory: boolean } | null {
  // Normalize paths for comparison (handle trailing slashes, windows separators, etc.)
  const normalizedFilePath = filePath.replace(/\\/g, "/");
  const normalizedEntrypointsDir = entrypointsDir
    .replace(/\\/g, "/")
    .replace(/\/$/, "");
  const entrypointsPrefix = `${normalizedEntrypointsDir}/`;

  // Try full path match first (build mode)
  const entrypointsIndex = normalizedFilePath.indexOf(entrypointsPrefix);
  if (entrypointsIndex !== -1) {
    const relativePath = normalizedFilePath.slice(
      entrypointsIndex + entrypointsPrefix.length
    );
    return parseRelativePath(relativePath);
  }

  // Fallback: URL-style path match (Vite dev server mode)
  // Vite dev server passes paths like: /entrypoints/popup/main.tsx
  // instead of: /Users/.../entrypoints/popup/main.tsx
  const urlStylePrefix = "/entrypoints/";
  if (normalizedFilePath.startsWith(urlStylePrefix)) {
    const relativePath = normalizedFilePath.slice(urlStylePrefix.length);
    return parseRelativePath(relativePath);
  }

  return null;
}

/**
 * Extracts the WXT entrypoint name from a file path.
 * Uses default "/entrypoints/" pattern for backward compatibility.
 *
 * @deprecated Use getWxtEntrypointInfo with explicit entrypointsDir instead
 */
export function getWxtEntrypointName(filePath: string): string | null {
  // Fallback to pattern matching for backward compatibility
  const entrypointsMatch = filePath.match(/\/entrypoints\/(.+)/);
  if (!entrypointsMatch) return null;

  const relativePath = entrypointsMatch[1];
  const name = relativePath.split(/[./\\]/, 2)[0];
  return name || null;
}

/**
 * Determines if an entrypoint directory name matches a UI HTML page type.
 *
 * @param dirName - The directory or file name (with type suffix, e.g., "settings.sidepanel")
 */
export function isUiPageEntrypoint(dirName: string): boolean {
  // Check exact matches for standard UI page entrypoints
  if (UI_PAGE_ENTRYPOINT_NAMES.has(dirName)) {
    return true;
  }

  // Check for named variants (e.g., "settings.sidepanel", "test.sandbox")
  for (const suffix of UI_PAGE_ENTRYPOINT_SUFFIXES) {
    if (dirName.endsWith(suffix)) {
      return true;
    }
  }

  return false;
}

/**
 * Determines if a file should skip console forwarding injection.
 *
 * Rules:
 * - Single-file JS/TS entrypoints (e.g., popup.ts): NEVER skip (WXT treats as unlisted-script)
 * - Directory-based entrypoints with UI page names (e.g., popup/main.tsx): SKIP
 * - Non-UI entrypoints (e.g., background/index.ts, content/index.ts): NEVER skip
 *
 * @param filePath - The file path to check
 * @param entrypointsDir - The entrypoints directory path
 */
export function shouldSkipConsoleForward(
  filePath: string,
  entrypointsDir: string
): boolean {
  const info = getWxtEntrypointInfo(filePath, entrypointsDir);
  if (!info) return false;

  // Single-file entrypoints: WXT only treats HTML files as UI pages.
  // JS/TS files like "popup.ts" are unlisted-script, not popup type.
  // Since we only transform JS/TS files, never skip single-file entrypoints.
  if (!info.isInSubdirectory) {
    return false;
  }

  // Directory-based entrypoints: Skip if the directory matches a UI page pattern.
  // e.g., popup/main.tsx should be skipped, background/index.ts should not.
  return isUiPageEntrypoint(info.dirName);
}

interface LogEntry {
  level: string;
  message: string;
  timestamp: Date;
  url?: string;
  userAgent?: string;
  stacks?: string[];
  extra?: any;
  module?: string;
  /** JSON-safe serialized args for format specifier processing (%c, %s) */
  rawArgs?: string[];
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
    const isServeCommand = wxt.config.command === "serve";

    if (!isServeCommand) {
      wxt.logger.info(
        "[console-forward] Module disabled (only active during wxt dev command)"
      );
      return;
    }

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

    // Get the dev server URL from WXT configuration
    if (!wxt.config.dev.server) {
      throw new Error(
        "Dev server configuration not found. Ensure the module runs with `wxt dev` so `dev.server` is available."
      );
    }
    const { host, port } = wxt.config.dev.server;
    const devServerUrl = `http://${host}:${port}`;

    wxt.logger.info(`[console-forward] Using dev server URL: ${devServerUrl}`);

    // Virtual modules
    const configModuleId = "virtual:console-forward-config";
    const forwardModuleId = "virtual:console-forward";
    const lastForwardedLogs: LogEntry[] = [];

    // Create the console forwarding Vite plugin
    const consoleForwardPlugin = (): Plugin => {
      return {
        name: "wxt-console-forward",

        configureServer(server) {
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

            // Support test helpers
            if (request.method === "GET") {
              res.writeHead(200, {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              });
              res.end(JSON.stringify({ logs: lastForwardedLogs }));
              return;
            }

            if (request.method === "DELETE") {
              lastForwardedLogs.length = 0;
              res.writeHead(204, {
                "Access-Control-Allow-Origin": "*",
              });
              res.end();
              return;
            }

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
                  lastForwardedLogs.push(log);
                  const location = log.url ? ` (${log.url})` : "";

                  // Format message with ANSI colors if rawArgs with format specifiers
                  const displayMessage =
                    log.rawArgs && hasFormatSpecifiers(log.rawArgs)
                      ? formatMessageWithANSI(log.rawArgs)
                      : log.message;

                  let message = `[${log.module || "unknown"}] [${log.level}] ${displayMessage}${location}`;

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
          const cleanId = id.replace(/^\/@id\/\0?/, "");

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
            return `
export const DEV_SERVER_ENDPOINT = '${devServerUrl}';
export const ENDPOINT_PATH = '${resolvedOptions.endpoint}';
export const SILENT_ON_ERROR = ${resolvedOptions.silentOnError};
export const LEVELS = ${JSON.stringify(resolvedOptions.levels)};
export const FORWARD_ERRORS = ${resolvedOptions.forwardErrors};
            `;
          }

          if (id === `\0${forwardModuleId}`) {
            return `
import { DEV_SERVER_ENDPOINT, ENDPOINT_PATH, SILENT_ON_ERROR, LEVELS, FORWARD_ERRORS } from '${configModuleId}';

// Singleton pattern to prevent duplicate initialization within the same window context
// Each iframe has its own window/console, so each patches independently for log forwarding
const CONSOLE_FORWARD_INITIALIZED_KEY = '__wxt_console_forward_initialized__';
let isInitialized = false;

// Module context tracking
let currentModuleContext = 'unknown';

export function setModuleContext(context) {
  currentModuleContext = context;
}

// Check if already initialized in this window context
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
  let extraIndex = 0;

  // Serialize arg to JSON-safe string (for rawArgs)
  function serializeArg(arg) {
    if (arg === undefined) return "undefined";
    if (arg === null) return "null";
    if (typeof arg === "string") return arg;
    if (arg instanceof Error || typeof arg.stack === "string") {
      return arg.toString();
    }
    if (typeof arg === "object" && arg !== null) {
      extraIndex++;
      return "[extra#" + extraIndex + "]";
    }
    return String(arg);
  }

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

  // Capture rawArgs for format specifier processing (%c, %s)
  const hasFormats =
    typeof args[0] === "string" &&
    (args[0].includes("%c") || args[0].includes("%s"));
  const rawArgs = hasFormats ? args.map(serializeArg) : undefined;

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
    rawArgs,
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

          // Check if this entrypoint should be excluded by user config
          const fileBasename = id
            .split("/")
            .pop()
            ?.replace(/\.[^.]+$/, "");
          if (
            fileBasename &&
            resolvedOptions.excludeEntrypoints.includes(fileBasename)
          ) {
            return;
          }

          // Skip UI HTML page entry point files in the entrypoints directory to avoid
          // React module resolution issues. UI pages (popup, options, devtools, sidepanel,
          // newtab, history, bookmarks, sandbox) load in browser extension iframes.
          // Prepending imports to these entry files can cause React to resolve differently,
          // leading to "Invalid hook call" errors.
          //
          // Only skip directory-based UI entrypoints (e.g., popup/main.tsx).
          // Single-file entrypoints (e.g., popup.ts) are unlisted-script in WXT, not UI pages.
          // Non-UI entrypoints (background, content-script) should NOT be skipped.
          if (shouldSkipConsoleForward(id, wxt.config.entrypointsDir)) {
            return;
          }

          // Extract entrypoint info for module context naming
          const wxtEntrypointInfo = getWxtEntrypointInfo(id, wxt.config.entrypointsDir);

          // Inject into all JS/TS files that aren't already importing the forward module
          if (
            (id.endsWith(".js") ||
              id.endsWith(".ts") ||
              id.endsWith(".tsx") ||
              id.endsWith(".jsx")) &&
            !code.includes(forwardModuleId) &&
            !code.includes("setModuleContext")
          ) {
            const moduleContext = wxtEntrypointInfo?.name || fileBasename || "unknown";
            const prependCode =
              `import { setModuleContext } from '${forwardModuleId}';\n` +
              `setModuleContext('${moduleContext}');\n` +
              `import '${forwardModuleId}';\n`;

            const s = new MagicString(code);
            s.prepend(prependCode);

            return {
              code: s.toString(),
              map: s.generateMap({ hires: true, source: id }),
            };
          }
        },

        // NOTE: HTML injection removed - the transform hook handles JS/TS entry files,
        // which covers popup/main.ts and other entrypoints. The JS transform approach
        // avoids CSP inline script violations in Chrome MV3 extension pages since
        // the imports are bundled into the JS output rather than inline in HTML.
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
