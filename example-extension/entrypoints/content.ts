export default defineContentScript({
  matches: ['*://*/*'],
  main() {
    console.log('[Content] Content script started on:', window.location.href);
    console.info('[Content] Page title:', document.title);

    // Test basic console methods
    setTimeout(() => {
      console.log('[Content] Basic content script logging');
      console.warn('[Content] Content script warning');
      console.error('[Content] Content script error');
      console.info('[Content] DOM ready state:', document.readyState);
      console.debug('[Content] User agent:', navigator.userAgent);
    }, 500);

    // Test DOM interaction logging
    setTimeout(() => {
      const elements = {
        title: document.title,
        url: window.location.href,
        elementCount: document.querySelectorAll('*').length,
        hasH1: document.querySelector('h1') !== null,
        scripts: document.scripts.length
      };
      
      console.log('[Content] Page analysis:', elements);
    }, 1000);

    // Test error handling in content script
    setTimeout(() => {
      try {
        // Simulate DOM error
        const nonExistent = document.querySelector('#non-existent-element') as HTMLElement;
        nonExistent.click();
      } catch (error) {
        console.error('[Content] DOM error caught:', error);
      }
    }, 1500);

    // Test promise rejection in content script
    setTimeout(() => {
      Promise.reject(new Error('Content script promise rejection'))
        .catch(() => {
          // Handled
        });
    }, 2000);

    // Inject inpage script
    setTimeout(() => {
      console.log('[Content] Injecting inpage script...');
      
      const script = document.createElement('script');
      script.src = browser.runtime.getURL('/inpage.js');
      script.onload = () => {
        console.log('[Content] Inpage script loaded successfully');
        script.remove();
      };
      script.onerror = (error) => {
        console.error('[Content] Failed to load inpage script:', error);
      };
      
      (document.head || document.documentElement).appendChild(script);
    }, 2500);

    // Test communication with background
    setTimeout(async () => {
      try {
        console.log('[Content] Sending message to background...');
        const response = await browser.runtime.sendMessage({
          type: 'test-response',
          from: 'content',
          url: window.location.href
        });
        console.log('[Content] Response from background:', response);
      } catch (error) {
        console.error('[Content] Failed to communicate with background:', error);
      }
    }, 3000);

    // Test scroll and interaction events
    let scrollCount = 0;
    const scrollHandler = () => {
      scrollCount++;
      if (scrollCount <= 3) {
        console.log(`[Content] Scroll event #${scrollCount}, position:`, {
          x: window.scrollX,
          y: window.scrollY,
          documentHeight: document.documentElement.scrollHeight,
          windowHeight: window.innerHeight
        });
      }
    };
    
    window.addEventListener('scroll', scrollHandler, { passive: true });

    // Test click event logging
    let clickCount = 0;
    const clickHandler = (event: MouseEvent) => {
      clickCount++;
      if (clickCount <= 5) {
        console.log(`[Content] Click event #${clickCount}:`, {
          target: (event.target as Element)?.tagName,
          coordinates: { x: event.clientX, y: event.clientY },
          button: event.button,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey
        });
      }
    };
    
    document.addEventListener('click', clickHandler);

    // Test mutation observer
    const observer = new MutationObserver((mutations) => {
      if (mutations.length > 0) {
        console.log(`[Content] DOM mutations detected:`, {
          count: mutations.length,
          types: [...new Set(mutations.map(m => m.type))],
          addedNodes: mutations.reduce((sum, m) => sum + m.addedNodes.length, 0),
          removedNodes: mutations.reduce((sum, m) => sum + m.removedNodes.length, 0)
        });
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true
    });

    // Test periodic content script logging
    let contentCounter = 0;
    const contentInterval = setInterval(() => {
      contentCounter++;
      console.log(`[Content] Periodic content log #${contentCounter} - Page visible:`, !document.hidden);
      
      if (contentCounter >= 3) {
        clearInterval(contentInterval);
        console.log('[Content] Periodic content logging completed');
      }
    }, 3000);

    // Cleanup
    setTimeout(() => {
      window.removeEventListener('scroll', scrollHandler);
      document.removeEventListener('click', clickHandler);
      observer.disconnect();
      console.log('[Content] Content script cleanup completed');
    }, 15000);

    console.log('[Content] Content script initialization complete');
  },
});