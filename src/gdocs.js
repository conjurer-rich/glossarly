class GoogleDocsHighlighter {
  constructor() {
    this.highlightCanvases = new Map();
    this.documentContent = null;
    this.terms = {};
    Logger.log("Initializing GoogleDocsHighlighter");
    this.init();

    // Listen for term updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "termsUpdated") {
        Logger.log("Received updated terms");
        this.terms = message.terms;
        this.highlightTerms();
      }
    });
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
    const pages = document.querySelectorAll(".kix-page");
    Logger.log("Setting up overlays for pages:", pages.length);
    pages.forEach((page, index) => {
      Logger.log(`Creating overlay for page ${index}`);
      this.createOverlayForPage(page);
    });
  }

  createOverlayForPage(page) {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 100;
    `;

    const pageCanvas = page.querySelector("canvas");
    if (pageCanvas) {
      canvas.width = pageCanvas.width;
      canvas.height = pageCanvas.height;
      Logger.log("Created canvas overlay:", {
        width: canvas.width,
        height: canvas.height,
        pageCanvas: pageCanvas,
      });
      page.appendChild(canvas);
      this.highlightCanvases.set(page, canvas);
    } else {
      Logger.warn("No canvas found in page:", page);
    }
  }

  observeCanvasChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.classList?.contains("kix-page")) {
            Logger.log("New page added:", node);
            this.createOverlayForPage(node);
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
    Logger.log("Active canvases:", this.highlightCanvases.size);

    // Clear all canvases
    this.highlightCanvases.forEach((canvas, page) => {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      Logger.log("Cleared canvas for page:", page);
    });

    // Process each text block
    this.documentContent.body.content.forEach((block, index) => {
      if (!block.paragraph?.elements) {
        Logger.log(`Skipping block ${index} - no paragraph elements`);
        return;
      }

      Logger.log(`Processing block ${index}:`, block);

      block.paragraph.elements.forEach((element, elemIndex) => {
        if (!element.textRun?.content) {
          Logger.log(`Skipping element ${elemIndex} - no text content`);
          return;
        }

        const text = element.textRun.content;
        const startIndex = element.startIndex;
        Logger.log(`Processing text element:`, {
          text,
          startIndex,
          length: text.length,
        });

        Object.keys(this.terms).forEach((term) => {
          const regex = new RegExp(`\\b${term}\\b`, "gi");
          let match;

          while ((match = regex.exec(text))) {
            const termStart = startIndex + match.index;
            const termEnd = termStart + term.length;
            Logger.log(`Found term "${term}":`, {
              termStart,
              termEnd,
              matchIndex: match.index,
              matchText: match[0],
            });

            this.drawUnderline(termStart, termEnd);
          }
        });
      });
    });
  }

  drawUnderline(startIndex, endIndex) {
    const pages = Array.from(this.highlightCanvases.keys());
    Logger.log("Looking for page for indices:", {
      startIndex,
      endIndex,
      totalPages: pages.length,
    });

    const targetPage = pages.find((page) => {
      const pageStart = parseInt(page.getAttribute("data-page-index")) * 1000;
      const pageEnd = pageStart + 1000;
      const isTarget = startIndex >= pageStart && endIndex <= pageEnd;
      Logger.log("Checking page:", {
        pageStart,
        pageEnd,
        isTarget,
        pageIndex: page.getAttribute("data-page-index"),
      });
      return isTarget;
    });

    if (!targetPage) {
      Logger.warn("No target page found for indices:", {
        startIndex,
        endIndex,
      });
      return;
    }

    const canvas = this.highlightCanvases.get(targetPage);
    const ctx = canvas.getContext("2d");

    // Calculate positions
    const x1 = (startIndex % 1000) * (canvas.width / 1000);
    const x2 = (endIndex % 1000) * (canvas.width / 1000);
    const y = 20;

    Logger.log("Drawing underline:", {
      x1,
      x2,
      y,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    });

    ctx.beginPath();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }
}

new GoogleDocsHighlighter();
