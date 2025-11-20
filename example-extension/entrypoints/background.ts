export default defineBackground(() => {
  console.log('[Background] Background script started');
  // Note: debug module cannot be used in MV3 service workers due to localStorage dependency
  console.info('[Background] Extension ID:', browser.runtime.id);
  
  // Test different console methods
  console.warn('[Background] This is a warning from background');
  console.error('[Background] This is an error from background');
  console.debug('[Background] This is debug from background');
  
  // Test object logging
  const backgroundData = {
    timestamp: new Date().toISOString(),
    extensionId: browser.runtime.id,
    version: browser.runtime.getManifest().version,
    context: 'background-service-worker'
  };
  
  console.log('[Background] Background data:', backgroundData);

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
  
  // Test error handling
  setTimeout(() => {
    try {
      throw new Error('Test background error with stack trace');
    } catch (error) {
      console.error('[Background] Caught error:', error);
    }
  }, 1000);
  
  // Test promise rejection
  setTimeout(() => {
    Promise.reject('Background promise rejection test')
      .catch(error => {
        console.log('[Background] Promise rejection handled:', error);
      });
  }, 3000);
  
  console.log('[Background] Background initialization complete');
});
