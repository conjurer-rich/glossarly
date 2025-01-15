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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getSettings") {
    chrome.storage.local.get("settings", (data) => {
      sendResponse(data.settings);
    });
    return true;
  } else if (message.type === "updateTerms") {
    // Handle terms update
  } else if (message.type === "openSidePanel") {
    chrome.sidePanel.setOptions({
      tabId: sender.tab.id,
      path: "src/sidepanel/sidepanel.html",
      enabled: true,
    });
    chrome.sidePanel.open({ tabId: sender.tab.id });
  } else if (message.type === "closeSidePanel") {
    chrome.sidePanel.setOptions({ tabId: sender.tab.id, enabled: false });
  }
});
