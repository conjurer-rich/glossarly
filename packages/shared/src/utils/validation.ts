/**
 * Validation utility functions for common data validation
 */

/**
 * Validates if a string is a valid UUID v4
 * @param value - The string to validate
 * @returns true if the value is a valid UUID, false otherwise
 */
export function isValidUUID(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validates if a string is a valid email address
 * @param value - The string to validate
 * @returns true if the value is a valid email, false otherwise
 */
export function isValidEmail(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Validates if a value is a non-empty string
 * @param value - The value to validate
 * @returns true if the value is a non-empty string, false otherwise
 */
export function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
