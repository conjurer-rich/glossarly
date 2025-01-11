chrome.runtime.onInstalled.addListener(() => {
  // Initialize storage with default terms and settings
  chrome.storage.local.set({
    glossaryTerms: {
      ROI: "Return on Investment",
      KPI: "Key Performance Indicator",
      B2B: "Business to Business",
    },
    settings: {
      enabled: true,
      googleDocsEnabled: true,
    },
  });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getSettings") {
    chrome.storage.local.get("settings", (data) => {
      sendResponse(data.settings);
    });
    return true;
  }

  if (request.type === "updateSettings") {
    chrome.storage.local.set({ settings: request.settings }, () => {
      // Notify all tabs about the setting change
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              type: "settingsUpdated",
              settings: request.settings,
            })
            .catch(() => {
              // Ignore errors for tabs that don't have the content script
            });
        });
      });
      sendResponse({ success: true });
    });
    return true;
  }
});
