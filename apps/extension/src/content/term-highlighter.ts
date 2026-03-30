import { TermCandidate } from '@glossarly/shared';
import { TextNodeRef } from './dom-scanner';

export class TermHighlighter {
  private highlightedTerms: Map<string, string> = new Map(); // term -> termId

  /**
   * Highlight detected terms in the DOM.
   */
  highlightTerms(candidates: TermCandidate[], textNodes: TextNodeRef[]): void {
    // Create a map of term IDs for easy lookup
    const termIds: Map<string, string> = new Map();
    for (const candidate of candidates) {
      if (!termIds.has(candidate.text)) {
        termIds.set(candidate.text, `glossarly-term-${Math.random().toString(36).substr(2, 9)}`);
      }
    }

    for (const candidate of candidates) {
      const termId = termIds.get(candidate.text)!;
      this.highlightCandidate(candidate, textNodes, termId);
      this.highlightedTerms.set(candidate.text, termId);
    }
  }

  private highlightCandidate(
    candidate: TermCandidate,
    textNodes: TextNodeRef[],
    termId: string
  ): void {
    const { text, position, context } = candidate;
    const { start, end } = position;

    // Find the text node(s) containing this candidate
    for (const nodeRef of textNodes) {
      const nodeStart = nodeRef.offset;
      const nodeEnd = nodeStart + nodeRef.text.length;

      // Check if candidate overlaps with this node
      if (start < nodeEnd && end > nodeStart) {
        const relativeStart = Math.max(0, start - nodeStart);
        const relativeEnd = Math.min(nodeRef.text.length, end - nodeStart);

        this.wrapTextInNode(
          nodeRef.node,
          relativeStart,
          relativeEnd,
          text,
          termId,
          context
        );
      }
    }
  }

  private wrapTextInNode(
    textNode: Text,
    start: number,
    end: number,
    termText: string,
    termId: string,
    context: string
  ): void {
    if (start >= end) return;

    const originalText = textNode.textContent || '';
    const before = originalText.substring(0, start);
    const matched = originalText.substring(start, end);
    const after = originalText.substring(end);

    const span = document.createElement('span');
    span.className = 'glossarly-highlight';
    span.setAttribute('data-glossarly-term', termText);
    span.setAttribute('data-glossarly-id', termId);
    span.setAttribute('data-glossarly-context', context);
    span.textContent = matched;

    const beforeNode = document.createTextNode(before);
    const afterNode = document.createTextNode(after);

    const parent = textNode.parentNode;
    if (parent) {
      parent.replaceChild(beforeNode, textNode);
      beforeNode.parentNode!.insertBefore(span, beforeNode.nextSibling);
      if (after) {
        span.parentNode!.insertBefore(afterNode, span.nextSibling);
      }
    }
  }

  /**
   * Remove all glossarly highlights from the page.
   */
  removeAllHighlights(): void {
    const highlights = document.querySelectorAll('.glossarly-highlight');
    for (const highlight of highlights) {
      const parent = highlight.parentNode;
      if (parent) {
        const textNode = document.createTextNode(highlight.textContent || '');
        parent.replaceChild(textNode, highlight);
      }
    }
    this.highlightedTerms.clear();
  }

  /**
   * Attach click handlers to all highlights.
   */
  onTermClick(callback: (termText: string, context: string) => void): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('glossarly-highlight')) {
        const termText = target.getAttribute('data-glossarly-term') || '';
        const context = target.getAttribute('data-glossarly-context') || '';
        callback(termText, context);
      }
    }, true);
  }
}
