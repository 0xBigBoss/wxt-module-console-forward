export default defineBackground({
  main() {
    console.log('[Background] Service worker started');
    console.info('[Background] Extension version:', browser.runtime.getManifest().version);

    // Test basic console methods
    setTimeout(() => {
      console.log('[Background] Basic logging test');
      console.warn('[Background] This is a warning message');
      console.error('[Background] This is an error message');
      console.info('[Background] This is an info message'); 
      console.debug('[Background] This is a debug message');
    }, 1000);

    // Test object and array logging
    setTimeout(() => {
      const testObject = {
        name: 'Test Object',
        nested: {
          value: 42,
          array: [1, 2, 3, 'test']
        },
        timestamp: new Date()
      };
      
      console.log('[Background] Test object:', testObject);
      console.log('[Background] Test array:', [1, 2, 3, { key: 'value' }]);
    }, 2000);

    // Test error handling
    setTimeout(() => {
      try {
        throw new Error('Test background error with stack trace');
      } catch (error) {
        console.error('[Background] Caught error:', error);
      }
    }, 3000);

    // Test promise rejection
    setTimeout(() => {
      Promise.reject(new Error('Background promise rejection test'))
        .catch(() => {
          // Handled, but should still be forwarded by the module
        });
    }, 4000);

    // Test unhandled promise rejection
    setTimeout(() => {
      Promise.reject('Unhandled background promise rejection');
    }, 5000);

    // Test performance timing
    setTimeout(() => {
      const start = performance.now();
      
      // Simulate some work
      let sum = 0;
      for (let i = 0; i < 100000; i++) {
        sum += i;
      }
      
      const end = performance.now();
      console.log(`[Background] Performance test completed in ${end - start}ms. Result: ${sum}`);
    }, 6000);

    // Test periodic logging
    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      console.log(`[Background] Periodic log #${counter} at ${new Date().toISOString()}`);
      
      if (counter >= 5) {
        clearInterval(interval);
        console.log('[Background] Periodic logging completed');
      }
    }, 2000);

    // Listen for messages from content scripts
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[Background] Received message:', message, 'from:', sender.tab?.url);
      
      if (message.type === 'test-response') {
        sendResponse({
          success: true,
          timestamp: Date.now(),
          backgroundCounter: counter
        });
      }
    });

    console.log('[Background] Background script initialization complete');
  },
});