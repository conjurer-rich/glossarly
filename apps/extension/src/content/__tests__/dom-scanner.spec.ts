/**
 * @jest-environment jsdom
 */
import { DOMScanner } from '../dom-scanner';

function setBodyHTML(html: string) {
  document.body.innerHTML = html;
}

describe('DOMScanner', () => {
  describe('extractVisibleText', () => {
    it('extracts visible text from simple paragraphs', () => {
      setBodyHTML('<p>Hello world</p>');
      const scanner = new DOMScanner();

      const result = scanner.extractVisibleText();

      expect(result.text).toContain('Hello world');
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    it('concatenates text from multiple elements', () => {
      setBodyHTML('<p>First</p><p>Second</p>');
      const scanner = new DOMScanner();

      const result = scanner.extractVisibleText();

      expect(result.text).toContain('First');
      expect(result.text).toContain('Second');
    });

    it('tracks correct offsets for each text node', () => {
      setBodyHTML('<p>AAA</p><p>BBB</p>');
      const scanner = new DOMScanner();

      const result = scanner.extractVisibleText();

      const aaaNode = result.nodes.find(n => n.text.includes('AAA'));
      const bbbNode = result.nodes.find(n => n.text.includes('BBB'));
      expect(aaaNode).toBeDefined();
      expect(bbbNode).toBeDefined();
      expect(bbbNode!.offset).toBeGreaterThan(aaaNode!.offset);
    });

    it('skips script tags', () => {
      setBodyHTML('<p>Visible</p><script>invisible</script>');
      const scanner = new DOMScanner();

      const result = scanner.extractVisibleText();

      expect(result.text).toContain('Visible');
      expect(result.text).not.toContain('invisible');
    });

    it('skips style tags', () => {
      setBodyHTML('<p>Visible</p><style>.hidden { display: none; }</style>');
      const scanner = new DOMScanner();

      const result = scanner.extractVisibleText();

      expect(result.text).not.toContain('.hidden');
    });

    it('returns empty text and nodes for empty body', () => {
      setBodyHTML('');
      const scanner = new DOMScanner();

      const result = scanner.extractVisibleText();

      expect(result.text).toBe('');
      expect(result.nodes).toHaveLength(0);
    });

    it('skips whitespace-only text nodes', () => {
      setBodyHTML('<div>   </div><p>Content</p>');
      const scanner = new DOMScanner();

      const result = scanner.extractVisibleText();

      expect(result.nodes.every(n => n.text.trim().length > 0)).toBe(true);
    });
  });
});
