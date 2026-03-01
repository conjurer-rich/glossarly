/**
 * @jest-environment jsdom
 */
import { TermHighlighter } from '../term-highlighter';
import { TermCandidate } from '@glossarly/shared';
import { TextNodeRef } from '../dom-scanner';

function createCandidate(overrides: Partial<TermCandidate> = {}): TermCandidate {
  return {
    text: 'KPI',
    position: { start: 0, end: 3 },
    confidence: 90,
    context: 'Check the KPI dashboard.',
    category: 'acronym',
    ...overrides,
  };
}

function createTextNodeRef(text: string, offset: number = 0): TextNodeRef {
  document.body.innerHTML = `<p>${text}</p>`;
  const textNode = document.body.querySelector('p')!.firstChild as Text;
  return { node: textNode, text, offset };
}

function createHighlighter() {
  return new TermHighlighter();
}

describe('TermHighlighter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('highlightTerms', () => {
    it('wraps matched text in a span with glossarly-highlight class', () => {
      const highlighter = createHighlighter();
      const nodeRef = createTextNodeRef('Check KPI here');
      const candidate = createCandidate({
        text: 'KPI',
        position: { start: 6, end: 9 },
      });

      highlighter.highlightTerms([candidate], [{ ...nodeRef, offset: 0 }]);

      const highlight = document.querySelector('.glossarly-highlight');
      expect(highlight).not.toBeNull();
      expect(highlight!.textContent).toBe('KPI');
    });

    it('sets data-glossarly-term attribute on the highlight span', () => {
      const highlighter = createHighlighter();
      const nodeRef = createTextNodeRef('Check KPI here');
      const candidate = createCandidate({
        text: 'KPI',
        position: { start: 6, end: 9 },
      });

      highlighter.highlightTerms([candidate], [{ ...nodeRef, offset: 0 }]);

      const highlight = document.querySelector('.glossarly-highlight');
      expect(highlight!.getAttribute('data-glossarly-term')).toBe('KPI');
    });

    it('sets data-glossarly-id attribute on the highlight span', () => {
      const highlighter = createHighlighter();
      const nodeRef = createTextNodeRef('Check KPI here');
      const candidate = createCandidate({
        text: 'KPI',
        position: { start: 6, end: 9 },
      });

      highlighter.highlightTerms([candidate], [{ ...nodeRef, offset: 0 }]);

      const highlight = document.querySelector('.glossarly-highlight');
      expect(highlight!.getAttribute('data-glossarly-id')).toBeTruthy();
    });

    it('preserves surrounding text when wrapping', () => {
      const highlighter = createHighlighter();
      const nodeRef = createTextNodeRef('Check KPI here');
      const candidate = createCandidate({
        text: 'KPI',
        position: { start: 6, end: 9 },
      });

      highlighter.highlightTerms([candidate], [{ ...nodeRef, offset: 0 }]);

      const p = document.querySelector('p')!;
      expect(p.textContent).toBe('Check KPI here');
    });

    it('highlights multiple different terms', () => {
      document.body.innerHTML = '<p>Check KPI and ARR metrics</p>';
      const textNode = document.body.querySelector('p')!.firstChild as Text;
      const nodeRef: TextNodeRef = {
        node: textNode,
        text: 'Check KPI and ARR metrics',
        offset: 0,
      };
      const highlighter = createHighlighter();
      const candidates = [
        createCandidate({ text: 'KPI', position: { start: 6, end: 9 } }),
        createCandidate({ text: 'ARR', position: { start: 14, end: 17 } }),
      ];

      highlighter.highlightTerms(candidates, [nodeRef]);

      const highlights = document.querySelectorAll('.glossarly-highlight');
      expect(highlights.length).toBeGreaterThanOrEqual(1);
    });

    it('sets data-glossarly-context attribute with candidate context', () => {
      const highlighter = createHighlighter();
      const nodeRef = createTextNodeRef('Check KPI here');
      const candidate = createCandidate({
        text: 'KPI',
        position: { start: 6, end: 9 },
        context: 'Check KPI here for details.',
      });

      highlighter.highlightTerms([candidate], [{ ...nodeRef, offset: 0 }]);

      const highlight = document.querySelector('.glossarly-highlight');
      expect(highlight!.getAttribute('data-glossarly-context')).toBe(
        'Check KPI here for details.'
      );
    });
  });

  describe('removeAllHighlights', () => {
    it('removes all highlight spans and restores text nodes', () => {
      const highlighter = createHighlighter();
      const nodeRef = createTextNodeRef('Check KPI here');
      const candidate = createCandidate({
        text: 'KPI',
        position: { start: 6, end: 9 },
      });

      highlighter.highlightTerms([candidate], [{ ...nodeRef, offset: 0 }]);
      highlighter.removeAllHighlights();

      expect(document.querySelectorAll('.glossarly-highlight').length).toBe(0);
      expect(document.querySelector('p')!.textContent).toBe('Check KPI here');
    });
  });

  describe('onTermClick', () => {
    it('fires callback with term text and context when highlight is clicked', () => {
      const highlighter = createHighlighter();
      const nodeRef = createTextNodeRef('Check KPI here');
      const candidate = createCandidate({
        text: 'KPI',
        position: { start: 6, end: 9 },
        context: 'Check KPI here for details.',
      });
      highlighter.highlightTerms([candidate], [{ ...nodeRef, offset: 0 }]);

      const callback = jest.fn();
      highlighter.onTermClick(callback);

      const highlight = document.querySelector('.glossarly-highlight') as HTMLElement;
      highlight.click();

      expect(callback).toHaveBeenCalledWith('KPI', 'Check KPI here for details.');
    });
  });
});
