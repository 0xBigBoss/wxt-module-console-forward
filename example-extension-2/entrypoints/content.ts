export default defineContentScript({
  matches: ['*://*/*'], // Match all websites for easier testing
  main() {
    console.log('[Content] Content script started on:', window.location.href);
    console.info('[Content] Document ready state:', document.readyState);
    console.warn('[Content] This is a warning from content script');
    console.error('[Content] This is an error from content script');
    
    // Test object logging
    const pageInfo = {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 50) + '...',
      elements: {
        total: document.querySelectorAll('*').length,
        images: document.images.length,
        links: document.links.length
      }
    };
    
    console.log('[Content] Page info:', pageInfo);
    
    // Test DOM interaction
    setTimeout(() => {
      console.log('[Content] DOM fully loaded, element count:', document.querySelectorAll('*').length);
      
      // Test periodic logging
      let contentCounter = 0;
      const contentInterval = setInterval(() => {
        contentCounter++;
        console.log(`[Content] Periodic content log #${contentCounter} - Scroll Y: ${window.scrollY}`);
        
        if (contentCounter >= 3) {
          clearInterval(contentInterval);
          console.log('[Content] Content periodic logging completed');
        }
      }, 3000);
    }, 1000);
    
    // Test event logging
    let clickCount = 0;
    document.addEventListener('click', (event) => {
      clickCount++;
      if (clickCount <= 5) {
        console.log(`[Content] Click #${clickCount} on:`, {
          tag: event.target?.tagName,
          id: event.target?.id,
          className: event.target?.className,
          position: { x: event.clientX, y: event.clientY }
        });
      }
    });
    
    console.log('[Content] Content script initialization complete');
  },
});
