import { defineConfig } from 'wxt';

export default defineConfig({
  modules: [],
  
  manifest: {
    name: 'Console Forward Test Extension',
    description: 'Test extension to demonstrate console log forwarding',
    version: '1.0.0',
    permissions: ['activeTab', 'scripting'],
    host_permissions: ['*://*/*'],
  },
  
  vite: () => ({
    plugins: [
      {
        name: 'console-forward-injector',
        transform(code: string, id: string) {
          // Only inject in entry files (background, content, etc.)
          if (!id.includes('entrypoints/') && !id.includes('inpage.js')) return null;
          
          // Skip HTML files
          if (id.endsWith('.html')) return null;
          
          console.log(`[console-forward] Injecting console forwarding into: ${id}`);
          
          // Detect context and inject appropriate forwarding code
          const forwardingCode = `
// Console forwarding injected by WXT module
(function() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;
  
  // Detect context
  let context = 'unknown';
  if (typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope) {
    context = 'background:service-worker';
  } else if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    context = 'worker';
  } else if (typeof window !== 'undefined') {
    if (window.location?.protocol === 'chrome-extension:') {
      context = 'popup:main-world';
    } else if (document?.readyState !== undefined) {
      context = 'content:main-world';
    } else {
      context = 'inpage:main-world';
    }
  }
  
  function forwardLog(level, args) {
    const timestamp = new Date().toISOString();
    const logData = {
      level,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '),
      context,
      timestamp
    };
    
    // Send to dev server
    fetch('http://localhost:3001/api/debug/client-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    }).catch(() => {}); // Silent fail if dev server down
  }
  
  console.log = function(...args) {
    forwardLog('log', args);
    return originalLog.apply(console, args);
  };
  
  console.error = function(...args) {
    forwardLog('error', args);
    return originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    forwardLog('warn', args);
    return originalWarn.apply(console, args);
  };
  
  console.info = function(...args) {
    forwardLog('info', args);
    return originalInfo.apply(console, args);
  };
  
  console.debug = function(...args) {
    forwardLog('debug', args);
    return originalDebug.apply(console, args);
  };
})();
`;
          
          return forwardingCode + '\n' + code;
        }
      }
    ]
  }),
});