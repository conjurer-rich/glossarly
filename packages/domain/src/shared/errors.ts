/**
 * Base domain error class.
 * All domain-specific errors should extend this class.
 */
export class DomainError extends Error {
  readonly code: string;

  constructor(message: string, code: string = 'DOMAIN_ERROR') {
    super(message);
    this.code = code;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

/**
 * Thrown when an entity is not found in the repository.
 */
export class EntityNotFoundError extends DomainError {
  constructor(message: string = 'Entity not found') {
    super(message, 'ENTITY_NOT_FOUND');
    Object.setPrototypeOf(this, EntityNotFoundError.prototype);
  }
}

/**
 * Thrown when domain validation rules are violated.
 */
export class ValidationError extends DomainError {
  constructor(message: string = 'Validation failed') {
    super(message, 'VALIDATION_ERROR');
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Thrown when an operation is not authorized.
 */
export class AuthorizationError extends DomainError {
  constructor(message: string = 'Authorization failed') {
    super(message, 'AUTHORIZATION_ERROR');
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Thrown when an external service (e.g., LLM) fails.
 */
export class ExternalServiceError extends DomainError {
  constructor(message: string = 'External service error') {
    super(message, 'EXTERNAL_SERVICE_ERROR');
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}
