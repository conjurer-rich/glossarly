function createTermElement(term, definition) {
  const termItem = document.createElement("div");
  termItem.className = "glossarly-term-item";
  const index = document.querySelectorAll(".glossarly-term-item").length + 1;

  termItem.innerHTML = `
    <div class="term-header">
      <div class="term-number">${index}</div>
      <div class="term-title">${term}</div>
      <div class="term-badges">
        <span class="term-badge">${definition.team || "BI team"}</span>
        <button class="term-edit">Edit</button>
      </div>
    </div>
    <div class="term-full-title">${definition.fullTitle || term}</div>
    <div class="term-description">${definition.description || definition}</div>
    <a href="#" class="term-learn-more">Learn more</a>
    <div class="term-meta">
      Definition added by <span class="term-author">${definition.author || "Mark Johnson"}</span>
      <span class="term-date">${definition.date || "11/12/2023"}</span>
    </div>
  `;

  return termItem;
}

function loadTerms() {
  const termsList = document.getElementById("termsList");
  termsList.innerHTML = "";

  chrome.storage.local.get("glossaryTerms", (data) => {
    const terms = data.glossaryTerms || {};
    Object.entries(terms).forEach(([term, definition]) => {
      termsList.appendChild(createTermElement(term, definition));
    });
  });
}

// Load terms when side panel opens
loadTerms();

// Listen for updates
chrome.storage.onChanged.addListener((changes) => {
  if (changes.glossaryTerms) {
    loadTerms();
  }
});
