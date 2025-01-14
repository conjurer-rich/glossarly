class GoogleDocsHighlighter {
  constructor() {
    this.terms = {};
    Logger.log("Initializing GoogleDocsHighlighter");

    // Load initial terms
    this.loadTerms().then(() => {
      this.init();
    });

    // Listen for term updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "termsUpdated") {
        Logger.log("Received updated terms");
        this.terms = message.terms;
        this.highlightTerms();
      }
    });

    // Add selection handling
    this.selectedTerms = new Set();
    this.selectionWidget = null;

    // Setup selection monitoring
    this.setupSelectionMonitoring();
  }

  async loadTerms() {
    try {
      Logger.log("Loading terms from storage");
      const storage = await chrome.storage.local.get("glossaryTerms");
      this.terms = storage.glossaryTerms || {};
      Logger.log("Loaded terms:", this.terms);
    } catch (error) {
      Logger.error("Error loading terms:", error);
      this.terms = {};
    }
  }

  async init() {
    try {
      Logger.log("Starting initialization");
      await this.waitForGoogleDocs();
      this.createMainWidget();
    } catch (error) {
      Logger.error("Error during initialization:", error);
    }
  }

  async waitForGoogleDocs() {
    Logger.log("Waiting for Google Docs to load");
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds total

      const check = setInterval(() => {
        attempts++;
        Logger.log(`Check attempt ${attempts}/${maxAttempts}`);

        // Look for canvas elements
        const canvasTiles = document.querySelectorAll(
          ".kix-canvas-tile-content"
        );
        const editor = document.querySelector(".kix-appview-editor");

        Logger.log("Found elements:", {
          hasEditor: !!editor,
          canvasCount: canvasTiles.length,
          firstCanvas: canvasTiles[0]?.getBoundingClientRect(),
        });

        if (editor && canvasTiles.length > 0) {
          Logger.log("Google Docs canvas is ready!");
          clearInterval(check);
          resolve();
        }

        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          Logger.error("Timeout waiting for Google Docs to load");
          clearInterval(check);
          reject(new Error("Timeout waiting for Google Docs"));
        }
      }, 100);
    });
  }

  setupSelectionMonitoring() {
    try {
      // Wait for editor to be ready
      const editor = document.querySelector(".kix-appview-editor");
      if (!editor) {
        Logger.warn("Editor container not found");
        return;
      }

      // Monitor mouseup events for selection changes
      editor.addEventListener("mouseup", () => {
        // Give the selection div time to appear
        setTimeout(() => this.checkForSelection(), 50);
      });

      // Also monitor keyboard selection
      editor.addEventListener("keyup", (e) => {
        const selectionKeys = [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Shift",
        ];
        if (selectionKeys.includes(e.key)) {
          setTimeout(() => this.checkForSelection(), 50);
        }
      });

      Logger.log("Selection monitoring set up on kix-appview-editor");
    } catch (error) {
      Logger.error("Error setting up selection monitoring:", error);
    }
  }

  checkForSelection() {
    try {
      // Remove existing widget
      this.removeSelectionWidget();

      // Look for the selection div
      const selectionDiv = document
        .querySelector(".kix-canvas-tile-selection svg clipPath")
        ?.closest(".kix-canvas-tile-selection");
      if (!selectionDiv) {
        Logger.log("No selection div found");
        return;
      }

      // Get the content div that's the previous sibling
      const contentDiv = selectionDiv.previousElementSibling;
      if (
        contentDiv.nodeName == "canvas" &&
        contentDiv.classList.contains("kix-canvas-tile-content")
      ) {
        contentDiv = contentDiv.previousElementSibling;
      }
      if (
        !contentDiv ||
        (contentDiv.nodeName == "div" &&
          !contentDiv.classList.contains("kix-canvas-tile-content"))
      ) {
        Logger.log("No content div found");
        return;
      }

      Logger.log("Found content div:", {
        div: contentDiv,
        classes: contentDiv.classList,
      });

      // Find paragraphs that intersect with the selection SVG's position
      const selectionRect = selectionDiv.querySelector("svg g rect");
      const selectionClientRect = selectionRect?.getBoundingClientRect();
      if (!selectionClientRect) {
        Logger.log("No selection client rect found");
        return;
      }

      const paragraphElements = contentDiv.querySelectorAll(
        'svg g[role="paragraph"]'
      );

      let selectedText = "";
      paragraphElements.forEach((paragraph) => {
        const paragraphRect = paragraph.getBoundingClientRect();
        if (this.rectsIntersect(paragraphRect, selectionClientRect)) {
          const paragraphText = paragraph.firstChild.getAttribute("aria-label");
          Logger.log("Found intersecting paragraph:", {
            text: paragraphText,
            rect: paragraphRect,
            element: paragraph,
          });
          selectedText += (selectedText ? " " : "") + paragraphText;
        }
      });

      if (!selectedText) {
        Logger.log("No selected text found in paragraphs");
        return;
      }

      Logger.log("Processing selection:", {
        text: selectedText,
        bounds: selectionClientRect,
        contentDiv: {
          paragraphs: paragraphElements.length,
          rect: contentDiv.getBoundingClientRect(),
        },
      });

      // Process the selection
      this.processSelectedText(selectedText, {
        left: selectionClientRect.left,
        right: selectionClientRect.right,
        top: selectionClientRect.top,
        bottom: selectionClientRect.bottom,
      });
    } catch (error) {
      Logger.error("Error checking for selection:", error);
    }
  }

  rectsIntersect(rect1, rect2) {
    return !(
      rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom
    );
  }

  processSelectedText(text, rect) {
    Logger.log("Processing selected text:", {
      text,
      rect,
      availableTerms: Object.keys(this.terms),
    });

    // Find matching terms
    const foundTerms = Object.entries(this.terms)
      .filter(([term]) => {
        const isMatch = text.toLowerCase().includes(term.toLowerCase());
        Logger.log(`Checking term "${term}":`, { isMatch, term });
        return isMatch;
      })
      .map(([term, definition]) => ({ term, definition }));

    // Draw underline only if terms were found
    if (foundTerms.length > 0) {
      this.drawTermUnderlines(text, foundTerms, rect);
    }

    // Show widget with found terms
    this.createSelectionWidget(rect, foundTerms);
  }

  drawTermUnderlines(text, foundTerms, rect) {
    try {
      // Find the selection SVG
      const selectionDiv = document.querySelector(".kix-canvas-tile-selection");
      if (!selectionDiv) return;

      const selectionSvg = selectionDiv.querySelector("svg");
      if (!selectionSvg) return;

      // Create or get our underline SVG
      let underlineSvg = document.querySelector(".glossarly-underline-svg");
      if (!underlineSvg) {
        underlineSvg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        underlineSvg.setAttribute("class", "glossarly-underline-svg");
        underlineSvg.style.position = "absolute";
        underlineSvg.style.pointerEvents = "none";
        underlineSvg.style.zIndex = "999";
        document.body.appendChild(underlineSvg);
      }

      // Copy dimensions and position from selection SVG
      const svgRect = selectionSvg.getBoundingClientRect();
      underlineSvg.style.left = `${svgRect.left + window.scrollX}px`;
      underlineSvg.style.top = `${svgRect.top + window.scrollY}px`;
      underlineSvg.style.width = `${svgRect.width}px`;
      underlineSvg.style.height = `${svgRect.height}px`;
      underlineSvg.setAttribute(
        "viewBox",
        selectionSvg.getAttribute("viewBox")
      );

      // Clear existing underlines
      underlineSvg.innerHTML = "";

      // Get all path elements from selection SVG
      const paths = selectionSvg.querySelectorAll("path");

      paths.forEach((path) => {
        const underline = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        underline.setAttribute("d", path.getAttribute("d"));
        underline.setAttribute("fill", "none");
        underline.setAttribute("stroke", "#1a73e8");
        underline.setAttribute("stroke-width", "2");
        underline.setAttribute("stroke-linecap", "round");
        underlineSvg.appendChild(underline);
      });

      Logger.log("Drew underlines for terms:", {
        termsCount: foundTerms.length,
        pathsCount: paths.length,
      });
    } catch (error) {
      Logger.error("Error drawing term underlines:", error);
    }
  }

  waitForElement(selector) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }

  createSelectionWidget(rect, terms) {
    // Remove any existing widget first
    this.removeSelectionWidget();

    Logger.log("Creating selection widget with terms:", terms);

    const widget = document.createElement("div");
    widget.className =
      "glossarly-selection-widget glossarly-selection-widget-left";
    widget.classList.add(terms.length > 0 ? "has-terms" : "no-terms");
    widget.textContent = terms.length > 0 ? "?" : "!";

    // Get the document container and its left margin
    const rulerIndent = document.querySelector(".docs-ruler-indent-start");
    let pageMargin = 72; // Default Google Docs margin

    if (rulerIndent) {
      const rulerRect = rulerIndent.getBoundingClientRect();
      pageMargin = rulerRect.left;
      Logger.log("Found ruler indent:", { left: rulerRect.left });
    } else {
      Logger.warn("Could not find ruler indent, using default margin");
    }

    // Position widget just left of the page margin
    const left = pageMargin - 40;
    const top = Math.max(rect.top + window.scrollY - 4, 100);
    widget.style.top = `${top}px`;
    widget.style.left = `${left}px`;

    Logger.log("Widget positioned at:", {
      left,
      top,
      pageMargin,
      hasRulerIndent: !!rulerIndent,
    });

    // Create popup for both cases
    const popup = document.createElement("div");
    popup.className = "glossarly-selection-popup";
    popup.style.display = "none";

    if (terms.length > 0) {
      // Add terms to popup
      terms.forEach(({ term, definition }) => {
        const termDiv = document.createElement("div");
        termDiv.className = "term";
        termDiv.textContent = term;

        const definitionDiv = document.createElement("div");
        definitionDiv.className = "definition";
        definitionDiv.textContent = definition;

        popup.appendChild(termDiv);
        popup.appendChild(definitionDiv);
      });
    } else {
      // Create "Add term" popup content
      const addTermDiv = document.createElement("div");
      addTermDiv.className = "add-term-prompt";

      const promptText = document.createElement("div");
      promptText.className = "prompt-text";
      promptText.textContent = "No terms found in selection.";

      const addButton = document.createElement("button");
      addButton.className = "glossarly-button";
      addButton.textContent = "Add as new term";
      addButton.addEventListener("click", () => {
        // Open the extension popup
        chrome.runtime.sendMessage({
          type: "openPopup",
          prefilledText: text, // You'll need to pass the selected text as a parameter to createSelectionWidget
        });
      });

      addTermDiv.appendChild(promptText);
      addTermDiv.appendChild(addButton);
      popup.appendChild(addTermDiv);
    }

    // Show/hide popup on hover (for both cases)
    widget.addEventListener("mouseenter", () => {
      popup.style.display = "block";
      popup.style.left = `${left + 36}px`;
      popup.style.top = `${top}px`;
    });

    widget.addEventListener("mouseleave", (e) => {
      // Check if moving to popup or its children
      if (popup.contains(e.relatedTarget) || e.relatedTarget === popup) return;

      // Give time to move to popup
      setTimeout(() => {
        // Only hide if mouse isn't over popup or widget
        if (!popup.matches(":hover") && !widget.matches(":hover")) {
          popup.style.display = "none";
        }
      }, 100);
    });

    popup.addEventListener("mouseleave", (e) => {
      // Check if moving back to widget
      if (e.relatedTarget === widget) return;

      // Give time to move back to widget
      setTimeout(() => {
        // Only hide if mouse isn't over popup or widget
        if (!popup.matches(":hover") && !widget.matches(":hover")) {
          popup.style.display = "none";
        }
      }, 100);
    });

    document.body.appendChild(popup);
    this.selectionWidget = { widget, popup };

    document.body.appendChild(widget);
  }

  removeSelectionWidget() {
    if (this.selectionWidget) {
      this.selectionWidget.widget.remove();
      this.selectionWidget.popup.remove();
      this.selectionWidget = null;
    }

    // Also remove underlines
    const underlineSvg = document.querySelector(".glossarly-underline-svg");
    if (underlineSvg) {
      underlineSvg.remove();
    }
  }

  createMainWidget() {
    const mainWidget = document.createElement("div");
    mainWidget.className = "glossarly-main-widget";

    // Create logo container
    const logoContainer = document.createElement("div");
    logoContainer.className = "glossarly-logo-container";
    const logo = document.createElement("img");
    logo.src = chrome.runtime.getURL("icons/favicon-48x48.png");
    logo.alt = "Glossarly";
    logoContainer.appendChild(logo);

    // Create expanded content
    const expandedContent = document.createElement("div");
    expandedContent.className = "glossarly-expanded-content";

    // Add power button
    const powerButton = document.createElement("button");
    powerButton.className = "glossarly-power-button";
    powerButton.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16">
      <path fill="currentColor" d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/>
    </svg>`;
    powerButton.title = "Toggle Glossarly";

    // Add view all terms button
    const viewTermsButton = document.createElement("button");
    viewTermsButton.className = "glossarly-terms-count";
    const termCount = Object.keys(this.terms).length;
    viewTermsButton.textContent = termCount;
    viewTermsButton.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "openSidePanel" });
    });

    expandedContent.appendChild(powerButton);
    expandedContent.appendChild(viewTermsButton);

    mainWidget.appendChild(logoContainer);
    mainWidget.appendChild(expandedContent);

    document.body.appendChild(mainWidget);

    // Store reference for later use
    this.mainWidget = mainWidget;

    // Update count when terms change
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "termsUpdated") {
        const newCount = Object.keys(message.terms).length;
        viewTermsButton.textContent = newCount;
      }
    });

    // Handle power button clicks
    powerButton.addEventListener("click", async () => {
      const storage = await chrome.storage.local.get("settings");
      const settings = storage.settings || { enabled: true };
      settings.enabled = !settings.enabled;
      await chrome.storage.local.set({ settings });

      powerButton.classList.toggle("off", !settings.enabled);
      mainWidget.classList.toggle("disabled", !settings.enabled);
    });
  }
}

new GoogleDocsHighlighter();
