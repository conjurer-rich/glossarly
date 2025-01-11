class GlossaryHighlighter {
  constructor() {
    this.terms = {};
    this.isGoogleDocs = window.location.hostname === "docs.google.com";
    this.termsFoundCount = 0;
    this.isEnabled = true;
    this.init();
  }

  async init() {
    // Load terms and settings from storage
    const storage = await chrome.storage.local.get([
      "glossaryTerms",
      "settings",
    ]);
    this.terms = storage.glossaryTerms || {};
    this.isEnabled = storage.settings?.enabled ?? true;
    this.setupObserver();
    if (this.isGoogleDocs) {
      this.createWidget();
      this.updateToggleButton();
    }
    if (this.isEnabled) {
      this.highlightTerms();
    }
  }

  updateToggleButton() {
    const toggleBtn = document.querySelector("#toggleGlossarly");
    if (toggleBtn) {
      toggleBtn.textContent = this.isEnabled
        ? "Disable Highlighting"
        : "Enable Highlighting";
    }
  }

  updateTermsCount() {
    const countElement = document.getElementById("termsFoundCount");
    if (countElement) {
      countElement.textContent = this.termsFoundCount;
    }
  }

  createWidget() {
    const widget = document.createElement("div");
    widget.className = "glossarly-widget";
    widget.innerHTML = `
      <div class="glossarly-widget-icon">
        <img src="${chrome.runtime.getURL(
          "icons/favicon-48x48.png"
        )}" alt="Glossarly" draggable="false">
      </div>
      <div class="glossarly-widget-menu">
        <div class="glossarly-widget-header">
          <h3>Glossarly</h3>
          <button class="glossarly-close-menu">×</button>
        </div>
        <div class="glossarly-widget-content">
          <div class="glossarly-widget-stats">
            <span>Terms Found: <strong id="termsFoundCount">0</strong></span>
          </div>
          <div class="glossarly-widget-actions">
            <button id="toggleGlossarly">Disable Highlighting</button>
            <button id="addNewTerm">Add New Term</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);
    this.setupWidgetListeners(widget);
    this.makeWidgetDraggable(widget);
  }

  setupWidgetListeners(widget) {
    const icon = widget.querySelector(".glossarly-widget-icon");
    const menu = widget.querySelector(".glossarly-widget-menu");
    const closeBtn = widget.querySelector(".glossarly-close-menu");
    const toggleBtn = widget.querySelector("#toggleGlossarly");
    const addTermBtn = widget.querySelector("#addNewTerm");

    icon.addEventListener("click", () => {
      menu.classList.toggle("active");
    });

    closeBtn.addEventListener("click", () => {
      menu.classList.remove("active");
    });

    toggleBtn.addEventListener("click", async () => {
      this.isEnabled = !this.isEnabled;

      // Update storage
      const storage = await chrome.storage.local.get("settings");
      const settings = storage.settings || {};
      await chrome.storage.local.set({
        settings: { ...settings, enabled: this.isEnabled },
      });

      // Update UI
      this.updateToggleButton();

      if (this.isEnabled) {
        this.highlightTerms();
      } else {
        this.removeHighlights();
      }
    });

    addTermBtn.addEventListener("click", () => {
      // Implement add term functionality
      menu.classList.remove("active");
      // Could open the extension popup or create an inline form
    });
  }

  makeWidgetDraggable(widget) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    // Prevent default drag behaviors
    widget.addEventListener("dragstart", (e) => {
      e.preventDefault();
    });

    widget.addEventListener("mousedown", (e) => {
      if (e.target.closest(".glossarly-widget-icon")) {
        e.preventDefault(); // Prevent any default mousedown behavior
        isDragging = true;
        initialX = e.clientX - widget.offsetLeft;
        initialY = e.clientY - widget.offsetTop;
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        widget.style.left = `${currentX}px`;
        widget.style.top = `${currentY}px`;
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  setupObserver() {
    // Watch for DOM changes to handle dynamic content
    const targetNode = this.isGoogleDocs
      ? document.querySelector(".kix-appview-editor")
      : document.body;

    if (!targetNode) return;

    const observer = new MutationObserver((mutations) => {
      // For Google Docs, we need to debounce the highlighting
      if (this.isGoogleDocs) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => this.highlightTerms(), 500);
      } else {
        this.highlightTerms();
      }
    });

    observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  highlightTerms() {
    if (!this.isEnabled) return;

    if (this.isGoogleDocs) {
      this.highlightGoogleDocsTerms();
    } else {
      this.highlightRegularTerms();
    }
  }

  highlightGoogleDocsTerms() {
    this.termsFoundCount = 0;
    const textNodes = document.querySelectorAll(".kix-lineview-text-block");

    textNodes.forEach((node) => {
      const originalText = node.textContent;
      let newText = originalText;
      let localTermsFound = 0;

      Object.keys(this.terms).forEach((term) => {
        const regex = new RegExp(`\\b${term}\\b`, "gi");
        const matches = originalText.match(regex);
        if (matches) {
          localTermsFound += matches.length;
          newText = newText.replace(regex, (match) => {
            return `<span class="glossarly-highlight" data-term="${term}">${match}</span>`;
          });
        }
      });

      if (
        newText !== originalText &&
        !node.querySelector(".glossarly-highlight")
      ) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = newText;
        // Replace the text content while preserving Google Docs styling
        const parent = node.parentElement;
        parent.innerHTML = tempDiv.innerHTML;
        this.termsFoundCount += localTermsFound;
      }
    });

    this.setupTooltips();
    this.updateTermsCount();
  }

  highlightRegularTerms() {
    this.termsFoundCount = 0;
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (
            node.parentElement.classList.contains("glossarly-highlight") ||
            ["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(
              node.parentElement.tagName
            )
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      const originalText = node.textContent;
      let newText = originalText;
      let hasMatch = false;
      let localTermsFound = 0;

      Object.keys(this.terms).forEach((term) => {
        const regex = new RegExp(`\\b${term}\\b`, "gi");
        const matches = originalText.match(regex);
        if (matches) {
          hasMatch = true;
          localTermsFound += matches.length;
          newText = newText.replace(regex, (match) => {
            return `<span class="glossarly-highlight" data-term="${term}">${match}</span>`;
          });
        }
      });

      if (hasMatch) {
        const span = document.createElement("span");
        span.innerHTML = newText;
        node.replaceWith(span);
        this.termsFoundCount += localTermsFound;
      }
    }

    this.setupTooltips();
    this.updateTermsCount();
  }

  setupTooltips() {
    document.querySelectorAll(".glossarly-highlight").forEach((element) => {
      element.addEventListener("mouseenter", (e) => {
        const term = e.target.dataset.term;
        const definition = this.terms[term];

        const tooltip = document.createElement("div");
        tooltip.className = "glossarly-tooltip";
        tooltip.textContent = definition;

        document.body.appendChild(tooltip);

        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 5}px`;
      });

      element.addEventListener("mouseleave", () => {
        const tooltip = document.querySelector(".glossarly-tooltip");
        if (tooltip) {
          tooltip.remove();
        }
      });
    });
  }

  removeHighlights() {
    // Remove all highlights from the document
    const highlights = document.querySelectorAll(".glossarly-highlight");
    highlights.forEach((highlight) => {
      const text = document.createTextNode(highlight.textContent);
      highlight.parentNode.replaceChild(text, highlight);
    });

    // Reset terms count
    this.termsFoundCount = 0;
    this.updateTermsCount();

    // Remove any tooltips
    const tooltips = document.querySelectorAll(".glossarly-tooltip");
    tooltips.forEach((tooltip) => tooltip.remove());
  }
}

// Initialize the highlighter
new GlossaryHighlighter();
