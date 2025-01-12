class GoogleDocsHighlighter {
  constructor() {
    this.highlightCanvases = new Map();
    this.documentContent = null;
    this.documentSettings = null;
    this.terms = {};
    this.paragraphToCanvasMap = new Map();
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

    // Bind methods
    this.handleSelection = this.handleSelection.bind(this);

    // Setup selection monitoring
    this.setupSelectionMonitoring();

    // Add widget styles
    this.addWidgetStyles();

    // Setup accessibility observer
    this.setupAccessibilityObserver();

    // Debug: Monitor all events
    this.setupEventDebugger();
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

      Logger.log("Setting up canvas overlays");
      this.setupCanvasOverlays();

      Logger.log("Setting up canvas observer");
      this.observeCanvasChanges();

      Logger.log("Getting document content");
      await this.getDocumentContent();

      Logger.log("Starting initial highlight");
      this.highlightTerms();
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

  setupCanvasOverlays() {
    const docCanvases = document.querySelectorAll(".kix-canvas-tile-content");
    Logger.log("Setting up overlays for canvases:", docCanvases.length);

    docCanvases.forEach((docCanvas, index) => {
      Logger.log(`Creating overlay for canvas ${index}`);
      this.createOverlayForCanvas(docCanvas, index);
    });
  }

  createOverlayForCanvas(docCanvas, canvasIndex) {
    const overlay = document.createElement("canvas");

    // Copy all canvas attributes
    for (const attr of docCanvas.attributes) {
      if (attr.name !== "data-canvas-id") {
        overlay.setAttribute(attr.name, attr.value);
      }
    }

    // Add Google Docs annotation attribute
    overlay.setAttribute("_docs_annotate_canvas_by_ext", "true");

    // Match dimensions exactly
    overlay.width = docCanvas.width;
    overlay.height = docCanvas.height;

    // Match positioning and transforms
    overlay.style.transform = docCanvas.style.transform;
    overlay.style.transformOrigin = docCanvas.style.transformOrigin;
    overlay.style.width = docCanvas.style.width;
    overlay.style.height = docCanvas.style.height;
    overlay.style.position = "absolute"; // Ensure absolute positioning
    overlay.style.pointerEvents = "none"; // Don't interfere with doc interaction

    // Add debug border
    overlay.style.border = "2px solid blue";
    overlay.style.boxSizing = "border-box";

    Logger.log("Created canvas overlay:", {
      canvasIndex,
      hasAnnotateAttr: overlay.hasAttribute("_docs_annotate_canvas_by_ext"),
      originalCanvas: {
        width: docCanvas.width,
        height: docCanvas.height,
        transform: docCanvas.style.transform,
        transformOrigin: docCanvas.style.transformOrigin,
        style: docCanvas.getAttribute("style"),
      },
      overlay: {
        width: overlay.width,
        height: overlay.height,
        transform: overlay.style.transform,
        transformOrigin: overlay.style.transformOrigin,
        style: overlay.getAttribute("style"),
      },
    });

    // Insert overlay right after the Google Docs canvas
    docCanvas.parentElement.insertBefore(overlay, docCanvas.nextSibling);
    this.highlightCanvases.set(canvasIndex, overlay);
  }

  observeCanvasChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.classList?.contains("kix-canvas-tile-content")) {
            Logger.log("New canvas added:", node);
            this.createOverlayForCanvas(node);
          }
        });
      });
    });

    const container = document.querySelector(".kix-appview-editor");
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
      Logger.log("Observer set up on container:", container);
    } else {
      Logger.warn("Could not find editor container");
    }
  }

  async getDocumentContent() {
    const match = window.location.pathname.match(/\/document\/d\/([^/]+)/);
    if (!match) {
      Logger.warn("Could not find document ID in URL");
      return;
    }

    const documentId = match[1];
    Logger.log(
      "Requesting document content from background script:",
      documentId
    );

    try {
      // Create a promise that times out after 30 seconds
      const response = await Promise.race([
        chrome.runtime.sendMessage({
          type: "getDocumentContent",
          documentId,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 30000)
        ),
      ]);

      if (response?.error) {
        throw new Error(response.error);
      }

      if (response?.content) {
        Logger.log("Received document content from background script");
        this.documentContent = response.content;

        // Extract and store document settings
        this.documentSettings = {
          pageSize: this.documentContent.documentStyle?.pageSize || {
            width: { magnitude: 612, unit: "PT" }, // Default US Letter width
            height: { magnitude: 792, unit: "PT" }, // Default US Letter height
          },
          marginTop: this.documentContent.documentStyle?.marginTop || {
            magnitude: 72,
            unit: "PT",
          },
          marginBottom: this.documentContent.documentStyle?.marginBottom || {
            magnitude: 72,
            unit: "PT",
          },
          marginLeft: this.documentContent.documentStyle?.marginLeft || {
            magnitude: 72,
            unit: "PT",
          },
          marginRight: this.documentContent.documentStyle?.marginRight || {
            magnitude: 72,
            unit: "PT",
          },
        };

        Logger.log("Document settings:", this.documentSettings);
      } else {
        throw new Error("No content received from background script");
      }
    } catch (error) {
      Logger.error("Error getting document content:", error);
      throw error;
    }
  }

  highlightTerms() {
    if (!this.documentContent) {
      Logger.warn("No document content available");
      return;
    }

    Logger.log("Starting term highlighting");
    this.clearAllHighlights();

    // Process each text block
    this.documentContent.body.content.forEach((block, blockIndex) => {
      if (!block.paragraph?.elements) {
        Logger.log(`Skipping block ${blockIndex} - no paragraph elements`);
        return;
      }

      const canvasIndex = Math.floor(blockIndex / 9); // Approximate 9 paragraphs per canvas
      this.paragraphToCanvasMap.set(blockIndex, canvasIndex);

      Logger.log(`Processing block ${blockIndex}:`, {
        block,
        canvasIndex,
      });

      block.paragraph.elements.forEach((element) => {
        if (!element.textRun?.content) return;

        const text = element.textRun.content;
        const startIndex = element.startIndex;

        Object.keys(this.terms).forEach((term) => {
          const regex = new RegExp(`\\b${term}\\b`, "gi");
          let match;

          while ((match = regex.exec(text))) {
            const termStart = startIndex + match.index;
            const termEnd = termStart + term.length;

            this.drawUnderline(termStart, termEnd, blockIndex);
          }
        });
      });
    });
  }

  clearAllHighlights() {
    this.highlightCanvases.forEach((canvas) => {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
  }

  drawUnderline(startIndex, endIndex, paragraphIndex) {
    const canvasIndex = this.paragraphToCanvasMap.get(paragraphIndex);
    if (canvasIndex === undefined) {
      Logger.warn("No canvas found for paragraph:", paragraphIndex);
      return;
    }

    const overlay = this.highlightCanvases.get(canvasIndex);
    if (!overlay) {
      Logger.warn("No overlay found for canvas:", canvasIndex);
      return;
    }

    const ctx = overlay.getContext("2d");
    const position = this.calculatePositionInCanvas(
      startIndex,
      endIndex,
      paragraphIndex
    );

    Logger.log("Drawing underline:", {
      paragraphIndex,
      canvasIndex,
      startIndex,
      endIndex,
      position,
    });

    ctx.beginPath();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 5;
    ctx.moveTo(position.x1, position.y);
    ctx.lineTo(position.x2, position.y);
    ctx.stroke();
  }

  calculatePositionInCanvas(startIndex, endIndex, paragraphIndex, textStyle) {
    const overlay = this.highlightCanvases.get(
      this.paragraphToCanvasMap.get(paragraphIndex)
    );

    // Convert PT to pixels (1 PT ≈ 1.33333 pixels)
    const PT_TO_PX = 1.33333;

    // Get document margins from API response
    const leftMarginPx = this.documentSettings.marginLeft.magnitude * PT_TO_PX;
    const pageWidthPx =
      this.documentSettings.pageSize.width.magnitude * PT_TO_PX;
    const contentWidthPx =
      pageWidthPx -
      (leftMarginPx + this.documentSettings.marginRight.magnitude * PT_TO_PX);

    // Get paragraph style from document content
    const paragraph =
      this.documentContent.body.content[paragraphIndex]?.paragraph;
    const paragraphStyle = paragraph?.paragraphStyle || {};

    // Convert indentation to pixels
    const indentStartPx =
      (paragraphStyle.indentStart?.magnitude || 0) * PT_TO_PX;
    const indentFirstLinePx =
      (paragraphStyle.indentFirstLine?.magnitude || 0) * PT_TO_PX;
    const alignmentOffset = this.calculateAlignmentOffset(
      paragraph,
      contentWidthPx
    );

    // Calculate text metrics
    const fontSize = textStyle?.fontSize?.magnitude || 11;
    const charWidthPx = fontSize * 0.6 * PT_TO_PX;

    // Calculate positions
    const effectiveLeftMargin =
      leftMarginPx + indentStartPx + indentFirstLinePx + alignmentOffset;
    const charsPerLine = contentWidthPx / charWidthPx;

    const x1 = effectiveLeftMargin + (startIndex % charsPerLine) * charWidthPx;
    const x2 = effectiveLeftMargin + (endIndex % charsPerLine) * charWidthPx;

    // Calculate y position
    const paragraphsPerCanvas = 9;
    const paragraphHeight = overlay.height / paragraphsPerCanvas;
    const paragraphOffsetInCanvas = paragraphIndex % paragraphsPerCanvas;
    const y = (paragraphOffsetInCanvas + 0.8) * paragraphHeight;

    Logger.log("Position calculation:", {
      documentSettings: this.documentSettings,
      paragraphStyle,
      effectiveLeftMargin,
      contentWidthPx,
      charsPerLine,
      x1,
      x2,
      y,
    });

    return { x1, x2, y };
  }

  calculateAlignmentOffset(paragraph, contentWidth) {
    const alignment = paragraph?.paragraphStyle?.alignment || "START";
    if (alignment === "CENTER") {
      // For centered text, we need to calculate the text block width
      // This is a simplified calculation
      return contentWidth / 4; // Approximate center alignment
    }
    if (alignment === "END") {
      // For right-aligned text
      return contentWidth / 2; // Approximate right alignment
    }
    return 0; // Default left alignment
  }

  addWidgetStyles() {
    const styles = document.createElement("style");
    styles.textContent = `
      .glossarly-widget {
        position: fixed;
        background: #1a73e8;
        border: 2px solid #185abc;
        border-radius: 4px;
        padding: 8px 12px;
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
      const selectionDiv = document.querySelector(".kix-canvas-tile-selection");
      if (!selectionDiv) {
        Logger.log("No selection div found");
        return;
      }

      // Get the content div that's the previous sibling
      const contentDiv =
        selectionDiv.previousElementSibling?.previousElementSibling;
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

  handleSelection() {
    Logger.log("Selection event triggered");
    // Remove existing widget
    this.removeSelectionWidget();

    try {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      Logger.log("Selection detected:", {
        hasSelection: !!selection,
        selectedText,
        selectionLength: selectedText.length,
        availableTerms: Object.keys(this.terms),
        selectionObject: {
          rangeCount: selection.rangeCount,
          isCollapsed: selection.isCollapsed,
          type: selection.type,
        },
      });

      if (!selectedText) {
        Logger.log("No text selected, ignoring");
        return;
      }

      // Find terms in selection
      const foundTerms = Object.entries(this.terms)
        .filter(([term]) => {
          const isMatch = selectedText
            .toLowerCase()
            .includes(term.toLowerCase());
          Logger.log(`Checking term "${term}":`, {
            isMatch,
            term,
            selectedText,
          });
          return isMatch;
        })
        .map(([term, definition]) => ({ term, definition }));

      Logger.log("Found terms in selection:", {
        count: foundTerms.length,
        terms: foundTerms,
      });

      if (foundTerms.length === 0) {
        Logger.log("No matching terms found");
        return;
      }

      // Create widget
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      Logger.log("Creating widget:", {
        position: {
          right: rect.right,
          top: rect.top,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        },
        terms: foundTerms,
      });

      this.createSelectionWidget(rect, foundTerms);
    } catch (error) {
      Logger.error("Error handling selection:", error);
    }
  }

  createSelectionWidget(rect, terms) {
    // Remove any existing widget first
    this.removeSelectionWidget();

    Logger.log("Creating widget with terms:", terms);

    const widget = document.createElement("div");
    widget.className = "glossarly-widget";
    widget.textContent = "📚";

    // Position widget on the left side of the screen
    const left = 20; // Fixed position from left edge
    const top = Math.max(rect.top + window.scrollY - 4, 100); // Keep some minimum distance from top

    widget.style.left = `${left}px`;
    widget.style.top = `${top}px`;
    widget.style.position = "fixed"; // Use fixed positioning to stay on screen

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
      popup.style.left = `${left + 36}px`;
      popup.style.top = `${top}px`;
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

  setupAccessibilityObserver() {
    try {
      // Observer for accessibility announcements
      const accessibilityObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          // Check for accessibility announcements
          if (mutation.target.getAttribute("aria-live") === "polite") {
            const announcement = mutation.target.textContent?.trim();
            if (announcement) {
              Logger.log("Accessibility announcement:", announcement);

              // Check if it's a selection announcement
              if (announcement.includes("selected")) {
                Logger.log("Selection announcement detected");
                this.handleAccessibilitySelection(announcement);
              }
            }
          }

          // Check for focus changes
          if (mutation.target.getAttribute("aria-label")?.includes("Editing")) {
            Logger.log("Editor focus change detected:", {
              label: mutation.target.getAttribute("aria-label"),
              content: mutation.target.textContent,
            });
          }
        });
      });

      // Start observing accessibility elements
      const startObserving = async () => {
        // Wait for accessibility container
        const accessibilityContainer = await this.waitForElement(
          '[aria-live="polite"]'
        );
        if (accessibilityContainer) {
          Logger.log("Found accessibility container, starting observation");

          // Observe both attribute and content changes
          accessibilityObserver.observe(accessibilityContainer, {
            attributes: true,
            childList: true,
            subtree: true,
            characterData: true,
          });

          // Also observe the editor container for focus changes
          const editorContainer = await this.waitForElement(
            ".docs-editor-container"
          );
          if (editorContainer) {
            accessibilityObserver.observe(editorContainer, {
              attributes: true,
              subtree: true,
              attributeFilter: ["aria-label"],
            });
          }
        }
      };

      startObserving();
    } catch (error) {
      Logger.error("Error setting up accessibility observer:", error);
    }
  }

  handleAccessibilitySelection(announcement) {
    try {
      // Extract selected text from announcement
      // Example announcement: "Selected: ROI means Return on Investment"
      const selectedText = announcement.replace("Selected:", "").trim();

      Logger.log("Processing accessibility selection:", {
        announcement,
        selectedText,
      });

      if (!selectedText) {
        Logger.log("No text in selection announcement");
        return;
      }

      // Get cursor position for widget placement
      const cursor = document.querySelector(".kix-cursor-caret");
      if (!cursor) {
        Logger.warn("Could not find cursor element");
        return;
      }

      const rect = cursor.getBoundingClientRect();

      // Process the selection
      this.processSelectedText(selectedText, rect);
    } catch (error) {
      Logger.error("Error handling accessibility selection:", error);
    }
  }

  setupEventDebugger() {
    // List of events we're interested in
    const eventsToMonitor = [
      "selectionchange",
      "select",
      "mouseup",
      "mousedown",
      "keyup",
      "keydown",
      "input",
      "docs-text-ui-selection-change",
      "docs-text-ui-annotation-add",
      "docs-text-ui-annotation-remove",
      "docs-text-ui-annotation-update",
      "docs-textevent",
      "docs-selectionchange",
      "docs-update",
    ];

    // Create a styled console group for each event
    const logEvent = (e) => {
      const timestamp = new Date().toISOString().split("T")[1];
      console.groupCollapsed(
        `%c${e.type}%c at ${timestamp}`,
        "color: #1a73e8; font-weight: bold",
        "color: gray"
      );
      console.log("Event:", {
        type: e.type,
        target: e.target,
        detail: e.detail,
        bubbles: e.bubbles,
        composed: e.composed,
        custom: e instanceof CustomEvent,
      });
      if (e.detail) {
        console.log("Event Detail:", e.detail);
      }
      console.groupEnd();
    };

    // Add listeners for each event
    eventsToMonitor.forEach((eventName) => {
      document.addEventListener(eventName, logEvent, { capture: true });
    });

    // Also monitor DOM mutations related to selection
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.target.classList?.contains("docs-text-ui-selection-svg") ||
          mutation.target.classList?.contains("kix-selection-overlay") ||
          mutation.target.getAttribute("_docs_annotate_canvas_by_ext")
        ) {
          console.groupCollapsed(
            `%cSelection-related DOM mutation%c at ${
              new Date().toISOString().split("T")[1]
            }`,
            "color: #e67700; font-weight: bold",
            "color: gray"
          );
          console.log("Mutation:", {
            type: mutation.type,
            target: mutation.target,
            addedNodes: mutation.addedNodes.length,
            removedNodes: mutation.removedNodes.length,
            attributeName: mutation.attributeName,
          });
          console.groupEnd();
        }
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    Logger.log("Event debugger setup complete");
  }
}

new GoogleDocsHighlighter();
