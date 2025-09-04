import './style.css';
import typescriptLogo from '@/assets/typescript.svg';
import viteLogo from '/wxt.svg';
import { setupCounter } from '@/components/counter';

console.log('[Popup] Popup script started');
console.info('[Popup] Extension popup opened');
console.warn('[Popup] This is a warning from popup');
console.error('[Popup] This is an error from popup');

// Test object logging
const popupData = {
  timestamp: new Date().toISOString(),
  windowSize: {
    width: window.innerWidth,
    height: window.innerHeight
  },
  location: window.location.href,
  context: 'extension-popup'
};

console.log('[Popup] Popup data:', popupData);

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://wxt.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="WXT logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Console Forward Test</h1>
    <div class="card">
      <button id="counter" type="button"></button>
      <button id="test-logs" type="button">Test Console Logs</button>
      <button id="test-error" type="button">Test Error</button>
    </div>
    <p class="read-the-docs">
      Check your terminal to see forwarded logs
    </p>
  </div>
`;

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!);

// Add test logging buttons
document.querySelector<HTMLButtonElement>('#test-logs')!.addEventListener('click', () => {
  console.log('[Popup] Test logs button clicked');
  console.info('[Popup] Testing different log levels');
  console.warn('[Popup] Warning level test');
  console.debug('[Popup] Debug level test');
  
  const testObj = {
    action: 'test-logs-clicked',
    timestamp: new Date().toISOString(),
    array: [1, 2, 3, { nested: true }]
  };
  console.log('[Popup] Test object:', testObj);
});

document.querySelector<HTMLButtonElement>('#test-error')!.addEventListener('click', () => {
  console.log('[Popup] Test error button clicked');
  try {
    throw new Error('Test error from popup button');
  } catch (error) {
    console.error('[Popup] Caught test error:', error);
  }
});

// Test periodic logging
let popupCounter = 0;
const popupInterval = setInterval(() => {
  popupCounter++;
  console.log(`[Popup] Periodic popup log #${popupCounter}`);
  
  if (popupCounter >= 3) {
    clearInterval(popupInterval);
    console.log('[Popup] Popup periodic logging completed');
  }
}, 5000);

console.log('[Popup] Popup initialization complete');
