import { isValidUUID, isValidEmail, isNonEmptyString } from '../utils/validation';

describe('isValidUUID', () => {
  it('accepts a valid UUID v4', () => {
    expect(isValidUUID('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')).toBe(true);
  });

  it('rejects non-string values', () => {
    expect(isValidUUID(123)).toBe(false);
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
  });

  it('rejects strings that are not UUID format', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('')).toBe(false);
  });

  it('rejects UUIDs that are not v4', () => {
    expect(isValidUUID('a1b2c3d4-e5f6-1a7b-8c9d-0e1f2a3b4c5d')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('accepts valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('first.last@domain.org')).toBe(true);
  });

  it('rejects non-string values', () => {
    expect(isValidEmail(42)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });

  it('rejects strings without @ sign', () => {
    expect(isValidEmail('no-at-sign')).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects email-like strings with trailing content', () => {
    expect(isValidEmail('user@example.com extra')).toBe(false);
  });
});

describe('isNonEmptyString', () => {
  it('accepts non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
  });

  it('rejects empty and whitespace-only strings', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString('\t\n')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isNonEmptyString(0)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(false)).toBe(false);
  });
});
