document.addEventListener("DOMContentLoaded", async () => {
  // Load existing terms
  loadTerms();

  // Setup add term form
  const addTermForm = document.getElementById("addTermForm");
  addTermForm.addEventListener("submit", handleAddTerm);
});

async function loadTerms() {
  const storage = await chrome.storage.local.get("glossaryTerms");
  const terms = storage.glossaryTerms || {};

  const termsList = document.getElementById("termsList");
  termsList.innerHTML = "";

  Object.entries(terms).forEach(([term, definition]) => {
    const termElement = document.createElement("div");
    termElement.className = "term-item";
    termElement.innerHTML = `
      <div class="term">${term}</div>
      <div class="definition">${definition}</div>
      <button class="delete-term" data-term="${term}">×</button>
    `;
    termsList.appendChild(termElement);
  });

  // Add delete handlers
  document.querySelectorAll(".delete-term").forEach((button) => {
    button.addEventListener("click", handleDeleteTerm);
  });
}

async function handleAddTerm(event) {
  event.preventDefault();

  const term = document.getElementById("termInput").value.trim();
  const definition = document.getElementById("definitionInput").value.trim();

  if (!term || !definition) {
    return;
  }

  try {
    // Get existing terms
    const storage = await chrome.storage.local.get("glossaryTerms");
    const terms = storage.glossaryTerms || {};

    // Add new term
    terms[term] = definition;

    // Save updated terms
    await chrome.storage.local.set({ glossaryTerms: terms });

    // Clear form
    document.getElementById("termInput").value = "";
    document.getElementById("definitionInput").value = "";

    // Reload terms list
    loadTerms();

    // Notify content script
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "termsUpdated",
        terms,
      });
    }
  } catch (error) {
    console.error("Error adding term:", error);
  }
}

async function handleDeleteTerm(event) {
  const term = event.target.dataset.term;

  try {
    // Get existing terms
    const storage = await chrome.storage.local.get("glossaryTerms");
    const terms = storage.glossaryTerms || {};

    // Remove term
    delete terms[term];

    // Save updated terms
    await chrome.storage.local.set({ glossaryTerms: terms });

    // Reload terms list
    loadTerms();

    // Notify content script
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "termsUpdated",
        terms,
      });
    }
  } catch (error) {
    console.error("Error deleting term:", error);
  }
}
