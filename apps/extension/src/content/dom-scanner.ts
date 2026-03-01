export interface TextNodeRef {
  node: Text;
  text: string;
  offset: number; // position in concatenated text
}

export class DOMScanner {
  private skipTags = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS',
    'IFRAME', 'OBJECT', 'EMBED'
  ]);

  /**
   * Extract visible text from DOM and return both concatenated text and node references.
   */
  extractVisibleText(): {
    text: string;
    nodes: TextNodeRef[];
  } {
    const nodes: TextNodeRef[] = [];
    const concatenatedText = this.walkDOM(document.documentElement, nodes, '');

    return {
      text: concatenatedText,
      nodes
    };
  }

  private walkDOM(node: Node, nodes: TextNodeRef[], concatenatedText: string): string {
    // Skip non-element/text nodes
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;

      // Skip tags we don't want to process
      if (this.skipTags.has(el.tagName)) {
        return concatenatedText;
      }

      // Skip hidden elements
      if (!this.isVisible(el)) {
        return concatenatedText;
      }

      // Process children
      for (let i = 0; i < node.childNodes.length; i++) {
        concatenatedText = this.walkDOM(node.childNodes[i], nodes, concatenatedText);
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).textContent || '';
      if (text.trim().length > 0) {
        const offset = concatenatedText.length;
        nodes.push({
          node: node as Text,
          text,
          offset
        });
        concatenatedText += text;
      }
    }

    return concatenatedText;
  }

  private isVisible(el: HTMLElement): boolean {
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }
}
