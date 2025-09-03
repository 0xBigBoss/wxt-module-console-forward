// This script runs in the main world context (same as the page)
(function() {
  console.log('[Inpage] Inpage script started - running in main world context');
  console.info('[Inpage] Location:', window.location.href);
  console.info('[Inpage] Document readyState:', document.readyState);

  // Test access to page's window object
  setTimeout(() => {
    console.log('[Inpage] Page window properties:', {
      hasJQuery: typeof window.$ !== 'undefined',
      hasReact: typeof window.React !== 'undefined',
      hasVue: typeof window.Vue !== 'undefined',
      hasAngular: typeof window.angular !== 'undefined',
      userAgent: navigator.userAgent,
      language: navigator.language
    });
    
    // Log global variables (common ones)
    const globals = [];
    for (const key in window) {
      if (window.hasOwnProperty(key) && typeof window[key] === 'function' && key.length < 20) {
        globals.push(key);
        if (globals.length >= 10) break;
      }
    }
    console.log('[Inpage] Sample global functions:', globals);
  }, 500);

  // Test object and array logging from inpage
  setTimeout(() => {
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      referrer: document.referrer,
      cookies: document.cookie.length > 0,
      localStorage: typeof window.localStorage !== 'undefined',
      sessionStorage: typeof window.sessionStorage !== 'undefined',
      elements: {
        total: document.querySelectorAll('*').length,
        images: document.images.length,
        links: document.links.length,
        forms: document.forms.length
      }
    };
    
    console.log('[Inpage] Page information:', pageInfo);
  }, 1000);

  // Test error handling in inpage context
  setTimeout(() => {
    try {
      // Try to access a potentially undefined property
      console.log('[Inpage] Testing undefined property access...');
      const result = window.someUndefinedProperty.someMethod();
      console.log('[Inpage] Unexpected success:', result);
    } catch (error) {
      console.error('[Inpage] Expected error caught:', error.message);
      console.warn('[Inpage] This error was expected and handled');
    }
  }, 1500);

  // Test promise rejection in inpage
  setTimeout(() => {
    Promise.reject(new Error('Inpage promise rejection test'))
      .catch(() => {
        console.log('[Inpage] Promise rejection was handled');
      });
  }, 2000);

  // Test unhandled promise rejection (should be caught by error forwarding)
  setTimeout(() => {
    console.warn('[Inpage] About to create unhandled promise rejection...');
    Promise.reject('Unhandled inpage promise rejection - should appear in console forward');
  }, 2500);

  // Test different console methods
  setTimeout(() => {
    console.log('[Inpage] Testing all console methods...');
    console.info('[Inpage] This is an info message');
    console.warn('[Inpage] This is a warning message');
    console.error('[Inpage] This is an error message');
    console.debug('[Inpage] This is a debug message');
    
    // Test console with multiple arguments
    console.log('[Inpage] Multiple arguments:', 'string', 42, true, null, undefined);
    
    // Test console with objects
    console.log('[Inpage] Object logging:', { nested: { value: 'test' }, array: [1, 2, 3] });
  }, 3000);

  // Test performance measurement
  setTimeout(() => {
    const start = performance.now();
    
    // Simulate DOM manipulation
    const testDiv = document.createElement('div');
    testDiv.style.display = 'none';
    testDiv.textContent = 'Test element';
    document.body.appendChild(testDiv);
    
    // Simulate some computation
    let result = 0;
    for (let i = 0; i < 10000; i++) {
      result += Math.random();
    }
    
    document.body.removeChild(testDiv);
    const end = performance.now();
    
    console.log(`[Inpage] Performance test: ${end - start}ms, result: ${result.toFixed(2)}`);
  }, 3500);

  // Test interaction with page events
  let inpageEventCount = 0;
  const inpageClickHandler = (event) => {
    inpageEventCount++;
    if (inpageEventCount <= 3) {
      console.log(`[Inpage] Click event #${inpageEventCount}:`, {
        target: event.target.tagName,
        id: event.target.id,
        className: event.target.className,
        position: { x: event.pageX, y: event.pageY }
      });
    }
  };
  
  document.addEventListener('click', inpageClickHandler);

  // Test window events
  const inpageResizeHandler = () => {
    console.log('[Inpage] Window resize:', {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight
    });
  };
  
  window.addEventListener('resize', inpageResizeHandler);

  // Test periodic logging from inpage
  let inpageCounter = 0;
  const inpageInterval = setInterval(() => {
    inpageCounter++;
    console.log(`[Inpage] Periodic log #${inpageCounter} - Focus:`, document.hasFocus());
    
    if (inpageCounter >= 3) {
      clearInterval(inpageInterval);
      console.log('[Inpage] Periodic inpage logging completed');
    }
  }, 4000);

  // Test accessing extension APIs (should fail in inpage context)
  setTimeout(() => {
    console.log('[Inpage] Testing extension API access (should fail)...');
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        console.log('[Inpage] Chrome runtime available:', !!chrome.runtime);
      } else {
        console.log('[Inpage] No chrome.runtime access (expected in inpage context)');
      }
    } catch (error) {
      console.log('[Inpage] Extension API access failed (expected):', error.message);
    }
  }, 4000);

  // Cleanup after test period
  setTimeout(() => {
    document.removeEventListener('click', inpageClickHandler);
    window.removeEventListener('resize', inpageResizeHandler);
    console.log('[Inpage] Inpage script cleanup completed');
  }, 20000);

  console.log('[Inpage] Inpage script initialization complete');
})();