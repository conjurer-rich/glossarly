/**
 * API contracts for error handling and standardized error responses
 */

/**
 * Standardized API error response
 */
export interface ApiError_Response {
  /** Error code identifier */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Optional additional details about the error */
  details?: Record<string, unknown>;
  /** ISO timestamp when the error occurred */
  timestamp: string;
  /** Unique request ID for tracing */
  requestId: string;
}

/**
 * Common error codes used throughout the API
 */
export const ERROR_CODES = {
  /** Requested term not found */
  TERM_NOT_FOUND: 'TERM_NOT_FOUND',
  /** Requested glossary not found */
  GLOSSARY_NOT_FOUND: 'GLOSSARY_NOT_FOUND',
  /** Rate limit exceeded */
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  /** Unauthorized request (missing or invalid auth) */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** Forbidden request (authenticated but not authorized) */
  FORBIDDEN: 'FORBIDDEN',
  /** Validation error in request payload */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** LLM provider error */
  LLM_PROVIDER_ERROR: 'LLM_PROVIDER_ERROR',
  /** Internal server error */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * Type-safe error codes
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
