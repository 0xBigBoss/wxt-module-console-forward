# WXT Console Forward Module

A WXT module that forwards console logs from web extension scripts (background, content, popup, and inpage) to the development server console. This makes debugging web extensions much easier by aggregating all logs in one place.

## Features

- ✅ **Development Mode Only** - Only works in development mode for security
- ✅ **All Contexts Supported** - Background, content scripts, popup, and injected inpage scripts
- ✅ **Dynamic Port Detection** - Automatically detects and uses the actual WXT dev server port
- ✅ **Command Line Support** - Works with custom ports specified via `--port` parameter
- ✅ **Error Forwarding** - Captures unhandled errors and promise rejections
- ✅ **Context Identification** - Clearly identifies which script context logs come from
- ✅ **Object & Array Logging** - Properly serializes complex objects
- ✅ **Stack Traces** - Forwards complete error stack traces
- ✅ **Automatic Injection** - No manual setup required in your scripts
- ✅ **Configurable** - Customize logging levels, endpoints, and exclusions

## Installation

```bash
npm install wxt-module-console-forward
```

## Usage

Add the module to your `wxt.config.ts`:

```typescript
import { defineConfig } from 'wxt';
import consoleForward from 'wxt-module-console-forward';

export default defineConfig({
  modules: [consoleForward],
  
  // Optional configuration
  consoleForward: {
    enabled: true, // Only works in dev mode anyway
    endpoint: '/api/debug/client-logs',
    levels: ['log', 'warn', 'error', 'info', 'debug'],
    excludeEntrypoints: [], // Array of entrypoint names to exclude
    silentOnError: false, // Show warnings when server is down
    forwardErrors: true, // Forward unhandled errors and promise rejections
  },
});
```

That's it! Now when you run `wxt dev`, all console logs from your extension scripts will appear in your terminal.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` (dev mode only) | Whether to enable console forwarding |
| `endpoint` | `string` | `'/api/debug/client-logs'` | API endpoint for receiving logs |
| `levels` | `string[]` | `['log', 'warn', 'error', 'info', 'debug']` | Console levels to forward |
| `excludeEntrypoints` | `string[]` | `[]` | Entrypoint names to exclude from logging |
| `silentOnError` | `boolean` | `true` | Don't show warnings when server is down |
| `forwardErrors` | `boolean` | `true` | Forward unhandled errors and promise rejections |

## Example Output

When you run your extension, you'll see logs like this in your terminal:

```
[background:service-worker] [log] Service worker started (chrome-extension://...)
[content:main-world] [log] Content script started on: https://example.com
[popup:main-world] [info] Extension popup opened
[inpage:main-world] [log] Inpage script started - running in main world context
[background:service-worker] [error] Test background error with stack trace
    at Object.main (background.ts:23:11)
    at background.ts:45:5
```

## How It Works

The module:

1. **Creates Virtual Modules** - Uses Vite's virtual module system to inject console forwarding code
2. **Automatic Injection** - Automatically injects the forwarding code into all your entrypoints
3. **Context Detection** - Identifies whether code is running in background, content, popup, or inpage context
4. **Log Buffering** - Batches logs before sending to reduce network overhead
5. **Dev Server Middleware** - Adds middleware to your dev server to receive and display logs

## Example Extension

Check out the `example-extension/` directory for a complete demo that showcases:

- **Background Script** - Service worker logging, errors, and periodic logs
- **Content Script** - DOM interaction logging, event handlers, and page analysis
- **Popup Interface** - Interactive buttons to test different logging scenarios
- **Inpage Script** - Main world context logging with page interaction

### Running the Example

```bash
cd example-extension
npm install
npm run dev
```

Then load the extension in Chrome and:
1. Open the popup to test interactive logging
2. Visit any webpage to see content script logs
3. Check your terminal to see all logs aggregated together

## Context Types

The module automatically detects and labels different execution contexts:

- `background:service-worker` - Background service worker
- `content:main-world` - Content script in isolated world
- `popup:main-world` - Extension popup
- `inpage:main-world` - Injected script in page's main world
- `unknown:unknown-context` - Fallback for undetected contexts

## Development

```bash
# Install dependencies
npm install

# Run the example extension
npm run dev

# Build the example extension
npm run build
```

## Requirements

- WXT ^0.19.0
- Vite ^5.0.0
- Development mode only (automatically disabled in production)

## License

MIT
