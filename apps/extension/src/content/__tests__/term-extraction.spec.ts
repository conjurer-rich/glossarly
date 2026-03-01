/**
 * @jest-environment jsdom
 */
import { TermExtractor } from '../term-extraction';

function createExtractor() {
  return new TermExtractor();
}

describe('TermExtractor', () => {
  describe('acronym detection', () => {
    it('detects uppercase acronyms like ARR and MRR', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates('Our ARR grew by 50% this quarter and MRR is up.');

      const terms = candidates.map(c => c.text);
      expect(terms).toContain('ARR');
      expect(terms).toContain('MRR');
    });

    it('assigns acronym category with 90 confidence', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates('The SLA was breached.');
      const sla = candidates.find(c => c.text === 'SLA');

      expect(sla).toBeDefined();
      expect(sla!.category).toBe('acronym');
      expect(sla!.confidence).toBe(90);
    });

    it('excludes common non-jargon acronyms like IT and AI', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates('IT and AI are not jargon. But OKR is.');

      const acronymCandidates = candidates.filter(c => c.category === 'acronym');
      const acronymTerms = acronymCandidates.map(c => c.text);
      expect(acronymTerms).not.toContain('IT');
      expect(acronymTerms).not.toContain('AI');
      expect(acronymTerms).toContain('OKR');
    });

    it('deduplicates repeated acronyms', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates('ARR this quarter. ARR last quarter.');
      const arrCount = candidates.filter(c => c.text === 'ARR').length;

      expect(arrCount).toBe(1);
    });
  });

  describe('camel/pascal case detection', () => {
    it('detects PascalCase compound words like SaaS and PaaS', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates('We offer SaaS and PaaS solutions.');

      const terms = candidates.map(c => c.text);
      expect(terms).toContain('SaaS');
      expect(terms).toContain('PaaS');
    });

    it('assigns compound category with 85 confidence', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates('Our new DevOps pipeline is ready.');
      const devops = candidates.find(c => c.text === 'DevOps');

      expect(devops).toBeDefined();
      expect(devops!.category).toBe('compound');
      expect(devops!.confidence).toBe(85);
    });
  });

  describe('pattern-based detection', () => {
    it('detects words ending in -ification and -ization', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates(
        'The gamification of learning drives monetization strategies.'
      );

      const terms = candidates.map(c => c.text);
      expect(terms).toContain('gamification');
      expect(terms).toContain('monetization');
    });

    it('detects X2Y patterns like B2B and B2C', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates('We focus on B2B and B2C markets.');

      const terms = candidates.map(c => c.text);
      expect(terms).toContain('B2B');
      expect(terms).toContain('B2C');
    });

    it('assigns pattern category with 80 confidence', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates('This is about gamification.');
      const gamification = candidates.find(c => c.text === 'gamification');

      expect(gamification).toBeDefined();
      expect(gamification!.category).toBe('pattern');
      expect(gamification!.confidence).toBe(80);
    });
  });

  describe('seed list detection', () => {
    it('detects known jargon terms from the seed list', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates(
        'Let us discuss the pipeline and our roadmap for next sprint.'
      );

      const terms = candidates.map(c => c.text);
      expect(terms).toContain('pipeline');
      expect(terms).toContain('roadmap');
      expect(terms).toContain('sprint');
    });

    it('matches seed terms case-insensitively', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates('The PIPELINE is full.');

      const terms = candidates.map(c => c.text);
      expect(terms).toContain('pipeline');
    });

    it('assigns jargon category with 70 confidence', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates('Check the backlog for today.');
      const backlog = candidates.find(c => c.text === 'backlog');

      expect(backlog).toBeDefined();
      expect(backlog!.category).toBe('jargon');
      expect(backlog!.confidence).toBe(70);
    });
  });

  describe('position tracking', () => {
    it('tracks correct start and end positions for detected terms', () => {
      const extractor = createExtractor();
      const text = 'Check our KPI dashboard.';

      const candidates = extractor.extractCandidates(text);
      const kpi = candidates.find(c => c.text === 'KPI');

      expect(kpi).toBeDefined();
      expect(text.substring(kpi!.position.start, kpi!.position.end)).toBe('KPI');
    });
  });

  describe('context extraction', () => {
    it('extracts surrounding context for each candidate', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates(
        'We need to improve our KPI tracking system.'
      );
      const kpi = candidates.find(c => c.text === 'KPI');

      expect(kpi).toBeDefined();
      expect(kpi!.context.length).toBeGreaterThan(0);
    });

    it('trims context to sentence boundaries when possible', () => {
      const extractor = createExtractor();
      const text = 'First sentence. Our KPI is great. Last sentence.';

      const context = extractor.extractContext(text, 20, 23);

      expect(context).not.toContain('First sentence');
    });

    it('limits context window to specified size', () => {
      const extractor = createExtractor();
      const longText = 'x'.repeat(500) + 'TERM' + 'y'.repeat(500);

      const context = extractor.extractContext(longText, 500, 504, 50);

      expect(context.length).toBeLessThanOrEqual(104);
    });
  });

  describe('deduplication across rules', () => {
    it('does not produce duplicate candidates when term matches multiple rules', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates('Check the ARR and ARR again.');
      const arrCandidates = candidates.filter(c => c.text === 'ARR');

      expect(arrCandidates).toHaveLength(1);
    });
  });

  describe('empty and edge cases', () => {
    it('returns empty array for empty text', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates('');

      expect(candidates).toEqual([]);
    });

    it('returns empty array for plain text with no jargon', () => {
      const extractor = createExtractor();

      const candidates = extractor.extractCandidates('The cat sat on the mat.');

      expect(candidates).toEqual([]);
    });
  });
});
