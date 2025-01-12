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
});
