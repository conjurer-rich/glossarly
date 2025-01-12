class GoogleDocsHighlighter {
  constructor() {
    this.highlightCanvases = new Map();
    this.documentContent = null;
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
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 100;
    `;

    const rect = docCanvas.getBoundingClientRect();
    overlay.width = rect.width;
    overlay.height = rect.height;
    overlay.style.transform = docCanvas.style.transform;

    Logger.log("Created canvas overlay:", {
      canvasIndex,
      width: overlay.width,
      height: overlay.height,
      transform: overlay.style.transform,
    });

    docCanvas.parentElement.appendChild(overlay);
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

      const canvasIndex = Math.floor(blockIndex / 2); // Approximate 2 paragraphs per canvas
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
    ctx.lineWidth = 2;
    ctx.moveTo(position.x1, position.y);
    ctx.lineTo(position.x2, position.y);
    ctx.stroke();
  }

  calculatePositionInCanvas(startIndex, endIndex, paragraphIndex) {
    const overlay = this.highlightCanvases.get(
      this.paragraphToCanvasMap.get(paragraphIndex)
    );
    const paragraphsPerCanvas = 2;
    const paragraphHeight = overlay.height / paragraphsPerCanvas;

    // Calculate y position based on paragraph position within canvas
    const paragraphOffsetInCanvas = paragraphIndex % paragraphsPerCanvas;
    const y = (paragraphOffsetInCanvas + 0.8) * paragraphHeight; // 0.8 to position near bottom of line

    // Calculate x positions (approximate)
    const charsPerLine = overlay.width / 8; // Assume 8px per character
    const x1 = (startIndex % charsPerLine) * 8;
    const x2 = (endIndex % charsPerLine) * 8;

    return { x1, x2, y };
  }
}

new GoogleDocsHighlighter();
