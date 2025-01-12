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

  if (request.type === "getDocumentContent") {
    console.log(
      "Background: received request for document:",
      request.documentId
    );

    // Create an async function to handle the request
    const handleRequest = async () => {
      try {
        const content = await getDocumentContent(request.documentId);
        console.log("Background: sending document content back");
        sendResponse({ content });
      } catch (error) {
        console.error("Background: error:", error);
        sendResponse({ error: error.message });
      }
    };

    // Execute the async function and keep message channel open
    handleRequest();
    return true; // Keep message channel open
  }

  if (request.type === "updateSettings") {
    chrome.storage.local.set({ settings: request.settings }, () => {
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

async function getDocumentContent(documentId) {
  try {
    console.log("Background: getting auth token...");
    const token = await chrome.identity.getAuthToken({ interactive: true });

    console.log("Background: making API request");
    const response = await fetch(
      `https://docs.googleapis.com/v1/documents/${documentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Background: API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (!data) {
      throw new Error("Empty response from API");
    }

    console.log("Background: got document data", {
      hasContent: !!data.body,
      contentLength: data.body?.content?.length,
    });

    return data;
  } catch (error) {
    console.error("Background: error getting document:", error);
    throw error;
  }
}
