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

    // Add widget styles
    this.addWidgetStyles();
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

  addWidgetStyles() {
    const styles = document.createElement("style");
    styles.textContent = `
      .glossarly-widget {
        position: fixed;
        background: #1a73e8;
        border: 2px solid #185abc;
        border-radius: 4px;
        padding: 0px 12px;
        font-size: 16px;
        color: white;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 2px 6px rgba(60, 64, 67, 0.3);
        font-family: 'Google Sans', Roboto, Arial, sans-serif;
      }

      .glossarly-widget:hover {
        background: #fff;
        box-shadow: 0 2px 6px rgba(60, 64, 67, 0.3);
      }

      .glossarly-popup {
        position: absolute;
        background: white;
        border-radius: 8px;
        padding: 16px;
        min-width: 200px;
        max-width: 300px;
        box-shadow: 0 4px 6px rgba(60, 64, 67, 0.3);
        z-index: 1001;
        font-family: 'Google Sans', Roboto, Arial, sans-serif;
      }

      .glossarly-popup .term {
        font-weight: 500;
        font-size: 14px;
        color: #1a73e8;
        margin-bottom: 8px;
      }

      .glossarly-popup .definition {
        font-size: 13px;
        color: #3c4043;
        line-height: 1.4;
      }
    `;
    document.head.appendChild(styles);
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

    if (foundTerms.length === 0) {
      Logger.log("No matching terms found");
      this.removeSelectionWidget();
      return;
    }

    // Draw underline for each found term
    this.drawTermUnderlines(text, foundTerms, rect);

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

    Logger.log("Creating widget with terms:", terms);

    const widget = document.createElement("div");
    widget.className = "glossarly-widget";
    widget.textContent = "📚";

    // Position widget under the selection
    const left = rect.left; // start of selection
    const top = Math.max(rect.top + window.scrollY - 4, 100); // Keep some minimum distance from top
    widget.style.border = "none";
    widget.style.top = `${top}px`;
    widget.style.position = "fixed"; // Use fixed positioning to stay on screen
    widget.style.width = "16px";
    widget.style.height = rect.height + "px";
    widget.style.left = `${left - 40}px`;
    widget.style.zIndex = "9999";
    widget.style.padding = "0px 0px";
    widget.style.borderRadius = "4px";

    Logger.log("Widget positioned at:", { left, top });

    // Create popup
    const popup = document.createElement("div");
    popup.className = "glossarly-popup";
    popup.style.display = "none";
    popup.style.position = "fixed"; // Use fixed positioning to stay on screen

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

    // Show/hide popup on hover
    widget.addEventListener("mouseenter", () => {
      popup.style.display = "block";
      popup.style.left = `${left - 10}px`;
      popup.style.top = `${top + 36}px`;
    });

    widget.addEventListener("mouseleave", (e) => {
      if (e.relatedTarget === popup) return;
      popup.style.display = "none";
    });

    popup.addEventListener("mouseleave", () => {
      popup.style.display = "none";
    });

    // Add selection change listener to hide widget when selection is cleared
    document.addEventListener("selectionchange", () => {
      setTimeout(() => {
        const selection = document.querySelector(".kix-canvas-tile-selection");
        if (!selection) {
          this.removeSelectionWidget();
        }
      }, 100);
    });

    document.body.appendChild(widget);
    document.body.appendChild(popup);

    this.selectionWidget = { widget, popup };
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
}

new GoogleDocsHighlighter();
