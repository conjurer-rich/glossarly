import { TermCandidate } from '@glossarly/shared';
import { DOMScanner } from './dom-scanner';
import { TermExtractor } from './term-extraction';
import { TermHighlighter } from './term-highlighter';

let domScanner: DOMScanner | null = null;
let termExtractor: TermExtractor | null = null;
let termHighlighter: TermHighlighter | null = null;
let currentCandidates: TermCandidate[] = [];

/**
 * Initialize and scan the page for terms.
 */
function scanPageForTerms(): void {
  if (!domScanner) domScanner = new DOMScanner();
  if (!termExtractor) termExtractor = new TermExtractor();
  if (!termHighlighter) termHighlighter = new TermHighlighter();

  // Scan DOM for visible text
  const { text: visibleText, nodes: textNodes } = domScanner.extractVisibleText();

  // Extract term candidates
  const candidates = termExtractor.extractCandidates(visibleText);
  currentCandidates = candidates;

  // Highlight terms
  termHighlighter.highlightTerms(candidates, textNodes);

  // Notify sidebar of detected terms
  chrome.runtime.sendMessage({
    type: 'TERMS_DETECTED',
    payload: { candidates }
  }).catch(() => {
    // Ignore if sidebar not open
  });

  console.log(`[Glossarly] Detected ${candidates.length} term candidates`);
}

/**
 * Handle messages from background/sidebar.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DETECTED_TERMS') {
    sendResponse({ candidates: currentCandidates });
  } else if (message.type === 'RESCAN_PAGE') {
    termHighlighter?.removeAllHighlights();
    scanPageForTerms();
    sendResponse({ success: true });
  }
});

/**
 * Attach click handlers to highlights.
 */
function setupClickHandlers(): void {
  if (!termHighlighter) return;

  termHighlighter.onTermClick((termText: string, context: string) => {
    // Get context from nearest sentence
    const allText = Array.from(document.querySelectorAll('body *'))
      .map((el) => el.textContent)
      .join(' ');
    const contextMatch = allText.match(new RegExp(`.{0,100}${termText}.{0,100}`, 'i'));
    const finalContext = contextMatch ? contextMatch[0] : context;

    // Send to service worker for enrichment
    chrome.runtime.sendMessage({
      type: 'ENRICH_TERM',
      payload: { term: termText, context: finalContext }
    }).catch(() => {
      // Ignore if service worker not ready
    });
  });
}

/**
 * Watch for DOM mutations (for SPA support).
 */
function setupMutationObserver(): void {
  const observer = new MutationObserver(() => {
    // Debounce rescan with 1s delay
    if ((window as any).glossarlyRescanTimeout) {
      clearTimeout((window as any).glossarlyRescanTimeout);
    }
    (window as any).glossarlyRescanTimeout = setTimeout(() => {
      if (termHighlighter) {
        termHighlighter.removeAllHighlights();
      }
      scanPageForTerms();
      setupClickHandlers();
    }, 1000);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: false
  });
}

/**
 * Initialize on document ready.
 */
function init(): void {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scanPageForTerms();
      setupClickHandlers();
      setupMutationObserver();
    });
  } else {
    scanPageForTerms();
    setupClickHandlers();
    setupMutationObserver();
  }
}

init();
