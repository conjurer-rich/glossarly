import { TermCategory, TermSource } from '../api/contracts/types';

describe('TermCategory', () => {
  it('provides runtime values for all categories', () => {
    expect(TermCategory.ACRONYM).toBe('ACRONYM');
    expect(TermCategory.JARGON).toBe('JARGON');
    expect(TermCategory.TECHNOLOGY).toBe('TECHNOLOGY');
    expect(TermCategory.INDUSTRY_TERM).toBe('INDUSTRY_TERM');
    expect(TermCategory.PRODUCT_NAME).toBe('PRODUCT_NAME');
  });
});

describe('TermSource', () => {
  it('provides runtime values for all sources', () => {
    expect(TermSource.AI_GENERATED).toBe('AI_GENERATED');
    expect(TermSource.USER_SUBMITTED).toBe('USER_SUBMITTED');
    expect(TermSource.SYSTEM_CURATED).toBe('SYSTEM_CURATED');
    expect(TermSource.USER_PROVIDED).toBe('USER_PROVIDED');
    expect(TermSource.LLM_ENRICHED).toBe('LLM_ENRICHED');
  });
});
