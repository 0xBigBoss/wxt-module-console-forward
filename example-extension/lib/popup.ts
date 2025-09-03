export default definePopup({
  main() {
    console.log('[Popup] Popup script started');
    console.info('[Popup] Extension popup opened');

    let clickCount = 0;
    let periodicInterval: number | null = null;
    let periodicCounter = 0;

    // Update click counter display
    function updateClickCounter() {
      clickCount++;
      const counter = document.getElementById('click-counter');
      if (counter) {
        counter.textContent = clickCount.toString();
      }
      console.log(`[Popup] Click counter updated: ${clickCount}`);
    }

    // Update status display
    function updateStatus(message: string, isError = false) {
      const status = document.getElementById('status');
      if (status) {
        status.textContent = message;
        status.style.color = isError ? '#ff6b6b' : '#fff';
      }
      console.log(`[Popup] Status: ${message}`);
    }

    // Test basic console methods
    document.getElementById('test-basic')?.addEventListener('click', () => {
      updateClickCounter();
      updateStatus('Testing basic console methods...');
      
      console.log('[Popup] Basic console.log test');
      console.info('[Popup] Basic console.info test');
      console.warn('[Popup] Basic console.warn test');
      console.error('[Popup] Basic console.error test');
      console.debug('[Popup] Basic console.debug test');
      
      updateStatus('Basic console methods tested');
    });

    // Test object logging
    document.getElementById('test-objects')?.addEventListener('click', () => {
      updateClickCounter();
      updateStatus('Testing object logging...');
      
      const testData = {
        popup: {
          timestamp: new Date(),
          windowSize: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          location: window.location.href,
          userAgent: navigator.userAgent.substring(0, 50) + '...'
        },
        array: [1, 2, 3, { nested: 'value' }],
        nullValue: null,
        undefinedValue: undefined,
        booleanValue: true
      };
      
      console.log('[Popup] Complex object test:', testData);
      console.log('[Popup] Array test:', ['popup', 'test', { key: 'value' }]);
      
      updateStatus('Object logging tested');
    });

    // Test error logging
    document.getElementById('test-errors')?.addEventListener('click', () => {
      updateClickCounter();
      updateStatus('Testing error logging...');
      
      try {
        // Create a test error with stack trace
        throw new Error('Test error from popup with stack trace');
      } catch (error) {
        console.error('[Popup] Caught test error:', error);
      }
      
      // Test different error types
      try {
        const obj: any = null;
        obj.someMethod();
      } catch (error) {
        console.error('[Popup] Null reference error:', error);
      }
      
      updateStatus('Error logging tested');
    });

    // Test promise rejections
    document.getElementById('test-promises')?.addEventListener('click', () => {
      updateClickCounter();
      updateStatus('Testing promise rejections...');
      
      // Handled promise rejection
      Promise.reject(new Error('Handled popup promise rejection'))
        .catch(error => {
          console.log('[Popup] Promise rejection handled:', error.message);
        });
      
      // Unhandled promise rejection (should be caught by error forwarding)
      setTimeout(() => {
        Promise.reject('Unhandled popup promise rejection');
      }, 100);
      
      updateStatus('Promise rejection tests initiated');
    });

    // Test performance timing
    document.getElementById('test-performance')?.addEventListener('click', () => {
      updateClickCounter();
      updateStatus('Testing performance timing...');
      
      const start = performance.now();
      
      // Simulate DOM manipulation work
      const testElements: HTMLElement[] = [];
      for (let i = 0; i < 100; i++) {
        const div = document.createElement('div');
        div.textContent = `Test element ${i}`;
        div.style.display = 'none';
        document.body.appendChild(div);
        testElements.push(div);
      }
      
      // Clean up
      testElements.forEach(el => el.remove());
      
      const end = performance.now();
      const duration = end - start;
      
      console.log(`[Popup] Performance test completed in ${duration.toFixed(2)}ms`);
      console.log(`[Popup] Created and removed ${testElements.length} DOM elements`);
      
      updateStatus(`Performance test: ${duration.toFixed(2)}ms`);
    });

    // Test communication with background
    document.getElementById('test-communication')?.addEventListener('click', async () => {
      updateClickCounter();
      updateStatus('Testing background communication...');
      
      try {
        console.log('[Popup] Sending message to background script...');
        
        const response = await browser.runtime.sendMessage({
          type: 'test-response',
          from: 'popup',
          timestamp: Date.now()
        });
        
        console.log('[Popup] Response received from background:', response);
        updateStatus('Background communication successful');
      } catch (error) {
        console.error('[Popup] Background communication failed:', error);
        updateStatus('Background communication failed', true);
      }
    });

    // Start periodic logging
    document.getElementById('start-periodic')?.addEventListener('click', () => {
      updateClickCounter();
      
      if (periodicInterval !== null) {
        clearInterval(periodicInterval);
      }
      
      periodicCounter = 0;
      periodicInterval = setInterval(() => {
        periodicCounter++;
        console.log(`[Popup] Periodic log #${periodicCounter} at ${new Date().toISOString()}`);
        
        if (periodicCounter >= 10) {
          document.getElementById('stop-periodic')?.click();
        }
      }, 1000);
      
      (document.getElementById('start-periodic') as HTMLButtonElement).disabled = true;
      (document.getElementById('stop-periodic') as HTMLButtonElement).disabled = false;
      
      updateStatus('Periodic logging started');
      console.log('[Popup] Started periodic logging');
    });

    // Stop periodic logging
    document.getElementById('stop-periodic')?.addEventListener('click', () => {
      if (periodicInterval !== null) {
        clearInterval(periodicInterval);
        periodicInterval = null;
      }
      
      (document.getElementById('start-periodic') as HTMLButtonElement).disabled = false;
      (document.getElementById('stop-periodic') as HTMLButtonElement).disabled = true;
      
      updateStatus('Periodic logging stopped');
      console.log('[Popup] Stopped periodic logging');
    });

    // Test window events
    window.addEventListener('resize', () => {
      console.log('[Popup] Popup window resized:', {
        width: window.innerWidth,
        height: window.innerHeight
      });
    });

    window.addEventListener('focus', () => {
      console.log('[Popup] Popup window focused');
    });

    window.addEventListener('blur', () => {
      console.log('[Popup] Popup window blurred');
    });

    // Test unload event
    window.addEventListener('beforeunload', () => {
      console.log('[Popup] Popup about to close');
      if (periodicInterval !== null) {
        clearInterval(periodicInterval);
      }
    });

    // Initial status update
    updateStatus('Popup loaded - Ready to test');
    
    // Test automatic logging on startup
    setTimeout(() => {
      console.log('[Popup] Automatic startup test after 1 second');
      console.info('[Popup] Popup initialization completed');
    }, 1000);

    console.log('[Popup] Popup script initialization complete');
  },
});