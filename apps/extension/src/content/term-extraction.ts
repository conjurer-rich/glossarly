import { TermCandidate } from '@glossarly/shared';

export class TermExtractor {
  private seedList: Set<string> = new Set([
    'pipeline', 'stakeholder', 'synergy', 'bandwidth', 'leverage', 'deliverable',
    'scalable', 'agile', 'sprint', 'standup', 'backlog', 'churn', 'paradigm',
    'paradigm shift', 'ecosystem', 'vertical', 'horizontal', 'silo', 'alignment',
    'roadmap', 'milestone', 'iteration', 'velocity', 'burndown', 'retrospective',
    'increment', 'touchpoint', 'solution', 'offering', 'value prop', 'pitch',
    'deck', 'business case', 'stakeholder', 'workflow', 'process', 'bottleneck',
    'friction', 'conversion', 'funnel', 'attribution', 'cohort', 'acquisition',
    'retention', 'engagement', 'churn rate', 'LTV', 'CAC', 'ARR', 'MRR',
    'OKR', 'KPI', 'North Star', 'core metrics', 'data-driven', 'analytics',
    'deep dive', 'touch base', 'circle back', 'low-hanging fruit', 'quick win',
    'move the needle', 'shift gears', 'double down', 'double click'
  ]);

  private acronymExclusionList: Set<string> = new Set([
    'I', 'IT', 'OK', 'US', 'UK', 'AI', 'API', 'URL', 'WWW', 'DNS', 'TCP', 'IP'
  ]);

  /**
   * Extract term candidates from text using multiple detection rules.
   */
  extractCandidates(text: string): TermCandidate[] {
    const candidates: TermCandidate[] = [];
    const seenTerms = new Set<string>();

    // Rule 1: Acronyms (2-6 uppercase letters)
    const acronymMatches = Array.from(text.matchAll(/\b([A-Z]{2,6})\b/g));
    for (const match of acronymMatches) {
      const term = match[0];
      if (!this.acronymExclusionList.has(term) && !seenTerms.has(term)) {
        const position = { start: match.index!, end: match.index! + term.length };
        const context = this.extractContext(text, position.start, position.end);
        candidates.push({
          text: term,
          position,
          confidence: 90,
          context,
          category: 'acronym'
        });
        seenTerms.add(term);
      }
    }

    // Rule 2: Camel/Pascal case compounds (SaaS, PaaS, etc.)
    const camelCaseMatches = Array.from(
      text.matchAll(/\b([A-Z][a-z]*[A-Z][a-zA-Z]*)\b/g)
    );
    for (const match of camelCaseMatches) {
      const term = match[0];
      if (!seenTerms.has(term)) {
        const position = { start: match.index!, end: match.index! + term.length };
        const context = this.extractContext(text, position.start, position.end);
        candidates.push({
          text: term,
          position,
          confidence: 85,
          context,
          category: 'compound'
        });
        seenTerms.add(term);
      }
    }

    // Rule 3: Common jargon patterns (-ification, -ization, B2B, B2C, etc.)
    const patternMatches = Array.from(
      text.matchAll(/\b(\w+(?:ification|ization)|\w+2\w+)\b/gi)
    );
    for (const match of patternMatches) {
      const term = match[0];
      if (!seenTerms.has(term)) {
        const position = { start: match.index!, end: match.index! + term.length };
        const context = this.extractContext(text, position.start, position.end);
        candidates.push({
          text: term,
          position,
          confidence: 80,
          context,
          category: 'pattern'
        });
        seenTerms.add(term);
      }
    }

    // Rule 4: Known seed list (case-insensitive)
    const words = text.split(/\s+/);
    let offset = 0;
    for (const word of words) {
      const cleanWord = word.toLowerCase().replace(/[^\w-]/g, '');
      if (this.seedList.has(cleanWord) && !seenTerms.has(cleanWord)) {
        const start = text.indexOf(word, offset);
        if (start !== -1) {
          const position = { start, end: start + word.length };
          const context = this.extractContext(text, position.start, position.end);
          candidates.push({
            text: cleanWord,
            position,
            confidence: 70,
            context,
            category: 'jargon'
          });
          seenTerms.add(cleanWord);
          offset = start + word.length;
        }
      }
    }

    return candidates;
  }

  /**
   * Extract surrounding context (sentence) for a term position.
   */
  extractContext(
    text: string,
    start: number,
    end: number,
    windowSize: number = 100
  ): string {
    const contextStart = Math.max(0, start - windowSize);
    const contextEnd = Math.min(text.length, end + windowSize);

    let result = text.substring(contextStart, contextEnd);

    // Try to trim to sentence boundaries
    const relativeStart = start - contextStart;
    const lastPeriod = result.lastIndexOf('.', relativeStart);
    const nextPeriod = result.indexOf('.', end - contextStart);

    if (lastPeriod > 0) {
      result = result.substring(lastPeriod + 1);
    }
    if (nextPeriod > 0) {
      result = result.substring(0, nextPeriod + 1);
    }

    return result.trim();
  }
}
