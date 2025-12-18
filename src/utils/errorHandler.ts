import { AxiosResponse } from "axios";
import {
  DebridError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  InsufficientQuotaError,
} from "../errors";

/**
 * Handles API responses and throws appropriate errors based on status codes.
 *
 * @param response - The Axios response object
 * @param provider - Name of the provider (e.g., "TorBox", "RealDebrid")
 * @throws {DebridError} or its subclasses based on the response status
 *
 * @example
 * ```typescript
 * const res = await axios.get('...');
 * handleApiResponse(res, 'TorBox'); // Throws error if not successful
 * // If we get here, response was successful
 * return res.data;
 * ```
 */
export function handleApiResponse(
  response: AxiosResponse,
  provider: string
): void {
  const { status, data: body } = response;

  // Success - do nothing
  if (status === 200 && body.success !== false) {
    return;
  }

  // Handle specific status codes
  switch (status) {
    case 401:
      throw new AuthenticationError(
        body.detail || body.error || "Invalid API key or token expired",
        provider,
        body
      );

    case 402:
    case 403:
      throw new InsufficientQuotaError(
        body.detail || body.error || "Insufficient storage or quota",
        provider,
        body
      );

    case 404:
      throw new NotFoundError(
        body.detail || body.error || "Resource not found",
        provider,
        body
      );

    case 429:
      throw new RateLimitError(
        body.detail || body.error || "Rate limit exceeded",
        body.retry_after,
        provider,
        body
      );

    default:
      // Generic error for any other unsuccessful response
      throw new DebridError(
        body.detail || body.error || "Unknown error occurred",
        status,
        provider,
        body
      );
  }
}

/**
 * Wraps an async function with error handling for API calls.
 * Automatically catches and converts network errors to DebridErrors.
 *
 * @param fn - The async function to wrap
 * @param provider - Name of the provider
 * @returns The result of the function or throws a DebridError
 *
 * @example
 * ```typescript
 * return await withErrorHandling(async () => {
 *   const res = await axios.get('...');
 *   handleApiResponse(res, 'TorBox');
 *   return res.data.data;
 * }, 'TorBox');
 * ```
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  provider: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof DebridError) {
      throw error;
    }

    // Wrap network errors
    if (isAxiosError(error)) {
      throw new DebridError(
        `Network error: ${error.message}`,
        error.response?.status,
        provider,
        error.response?.data
      );
    }

    // Wrap any other unexpected errors
    throw new DebridError(
      `Unexpected error: ${
        error instanceof Error ? error.message : String(error)
      }`,
      undefined,
      provider,
      error
    );
  }
}

/**
 * Type guard to check if an error is an Axios error
 */
function isAxiosError(error: any): error is {
  message: string;
  response?: AxiosResponse;
} {
  return error && error.isAxiosError === true;
}
