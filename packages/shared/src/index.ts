/**
 * @glossarly/shared package entry point
 * Exports all public API contracts, domain events, and utilities
 */

// API contracts and types
export * from './api';

// Domain events
export * from './domain/events';

// Utilities
export { isValidUUID, isValidEmail, isNonEmptyString } from './utils/validation';
