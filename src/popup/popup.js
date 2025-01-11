document.addEventListener("DOMContentLoaded", async () => {
  // Load and display terms
  const storage = await chrome.storage.local.get(["glossaryTerms", "settings"]);
  const terms = storage.glossaryTerms || {};
  const settings = storage.settings || {
    enabled: true,
    googleDocsEnabled: true,
  };

  // Setup event listeners
  document.getElementById("addTerm").addEventListener("click", addNewTerm);
  document
    .getElementById("toggleHighlight")
    .addEventListener("click", toggleHighlighting);

  // Add Google Docs toggle
  const googleDocsToggle = document.getElementById("googleDocsToggle");
  if (googleDocsToggle) {
    googleDocsToggle.checked = settings.googleDocsEnabled;
    googleDocsToggle.addEventListener("change", (e) => {
      chrome.storage.local.set({
        settings: { ...settings, googleDocsEnabled: e.target.checked },
      });
    });
  }

  displayTerms(terms);
});

function displayTerms(terms) {
  const termsList = document.getElementById("termsList");
  termsList.innerHTML = "";

  Object.entries(terms).forEach(([term, definition]) => {
    const termElement = createTermElement(term, definition);
    termsList.appendChild(termElement);
  });
}

function addNewTerm() {
  // Implementation will go here
}

function toggleHighlighting() {
  // Implementation will go here
}
