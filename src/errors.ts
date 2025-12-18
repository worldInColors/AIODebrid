/**
 * Base error class for all debrid provider errors.
 * Provides structured error information that can be programmatically handled.
 */
export class DebridError extends Error {
  /**
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code (if applicable)
   * @param provider - Name of the provider that threw the error
   * @param details - Additional error details from the API
   */
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly provider?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = "DebridError";

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DebridError);
    }
  }
}

/**
 * Thrown when authentication fails (invalid API key, expired token, etc.)
 */
export class AuthenticationError extends DebridError {
  constructor(message: string, provider?: string, details?: any) {
    super(message, 401, provider, details);
    this.name = "AuthenticationError";
  }
}

/**
 * Thrown when a requested resource is not found (torrent, file, etc.)
 */
export class NotFoundError extends DebridError {
  constructor(message: string, provider?: string, details?: any) {
    super(message, 404, provider, details);
    this.name = "NotFoundError";
  }
}

/**
 * Thrown when rate limits are exceeded
 */
export class RateLimitError extends DebridError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    provider?: string,
    details?: any
  ) {
    super(message, 429, provider, details);
    this.name = "RateLimitError";
  }
}

/**
 * Thrown when the user's account has insufficient quota/storage
 */
export class InsufficientQuotaError extends DebridError {
  constructor(message: string, provider?: string, details?: any) {
    super(message, 402, provider, details);
    this.name = "InsufficientQuotaError";
  }
}
