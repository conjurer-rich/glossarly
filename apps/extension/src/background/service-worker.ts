import { MessageHandler } from './message-handler';

const messageHandler = new MessageHandler(
  process.env.GLOSSARLY_API_URL || 'http://localhost:3000/api'
);

/**
 * Handle extension installation.
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Glossarly] Extension installed');
});

/**
 * Handle extension icon click - open side panel.
 * Uses setPanelBehavior so clicking the action icon toggles the panel.
 */
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err: Error) => console.error('[Glossarly] sidePanel setup error:', err));

/**
 * Listen for messages from content scripts and sidebar.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const result = await messageHandler.handle(message, sender);
      sendResponse(result);
    } catch (error) {
      console.error('[Glossarly] Message handling error:', error);
      sendResponse({ error: (error as Error).message });
    }
  })();

  // Return true to keep the message channel open for async response
  return true;
});
