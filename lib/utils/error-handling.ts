/**
 * Error handling utilities with retry logic and exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export interface RetryState {
  attempt: number;
  lastError: Error | null;
  isRetrying: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error, attempt: number) => {
    // Don't retry on client errors (4xx) except 408, 429
    if (error.message.includes('HTTP 4') && 
        !error.message.includes('HTTP 408') && 
        !error.message.includes('HTTP 429')) {
      return false;
    }
    return attempt < 3;
  },
};

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for async functions
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === opts.maxAttempts || !opts.shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      const delay = calculateRetryDelay(
        attempt,
        opts.baseDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Retry hook state manager
 */
export class RetryManager {
  private state: RetryState = {
    attempt: 0,
    lastError: null,
    isRetrying: false,
  };

  private options: Required<RetryOptions>;
  private onStateChange?: (state: RetryState) => void;

  constructor(options: RetryOptions = {}, onStateChange?: (state: RetryState) => void) {
    this.options = { ...DEFAULT_RETRY_OPTIONS, ...options };
    this.onStateChange = onStateChange;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.state = { attempt: 0, lastError: null, isRetrying: false };
    this.notifyStateChange();

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      this.state.attempt = attempt;
      this.state.isRetrying = attempt > 1;
      this.notifyStateChange();

      try {
        const result = await fn();
        this.state.isRetrying = false;
        this.state.lastError = null;
        this.notifyStateChange();
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.state.lastError = err;
        this.notifyStateChange();

        if (attempt === this.options.maxAttempts || !this.options.shouldRetry(err, attempt)) {
          this.state.isRetrying = false;
          this.notifyStateChange();
          throw err;
        }

        const delay = calculateRetryDelay(
          attempt,
          this.options.baseDelayMs,
          this.options.maxDelayMs,
          this.options.backoffMultiplier
        );

        await sleep(delay);
      }
    }

    throw this.state.lastError!;
  }

  getState(): RetryState {
    return { ...this.state };
  }

  private notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }
}

/**
 * Error boundary fallback component props
 */
export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  retry?: () => void;
}

/**
 * Create contextual error messages
 */
export function createContextualError(
  operation: string,
  originalError: Error,
  context?: Record<string, any>
): Error {
  const contextStr = context ? ` (${JSON.stringify(context)})` : '';
  const message = `Failed to ${operation}: ${originalError.message}${contextStr}`;
  
  const error = new Error(message);
  error.cause = originalError;
  error.stack = originalError.stack;
  
  return error;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Network errors are usually retryable
  if (message.includes('network') || 
      message.includes('connection') || 
      message.includes('timeout') ||
      message.includes('fetch')) {
    return true;
  }

  // HTTP 5xx errors are retryable
  if (message.includes('http 5')) {
    return true;
  }

  // HTTP 408 (timeout) and 429 (rate limit) are retryable
  if (message.includes('http 408') || message.includes('http 429')) {
    return true;
  }

  return false;
}

/**
 * Graceful degradation utility
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T> | T,
  options: RetryOptions = {}
): Promise<T> {
  try {
    return await withRetry(primary, options);
  } catch (error) {
    console.warn('Primary operation failed, using fallback:', error);
    return await fallback();
  }
}

/**
 * API error handler for Next.js routes
 */
export function handleApiError(error: unknown, defaultMessage = 'An error occurred'): Response {
  console.error('API Error:', error);
  
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  const statusCode = getErrorStatusCode(error);
  
  return new Response(
    JSON.stringify({
      ok: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Determine HTTP status code from error
 */
function getErrorStatusCode(error: unknown): number {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Client errors
    if (message.includes('not found') || message.includes('404')) return 404;
    if (message.includes('unauthorized') || message.includes('401')) return 401;
    if (message.includes('forbidden') || message.includes('403')) return 403;
    if (message.includes('bad request') || message.includes('400')) return 400;
    if (message.includes('timeout') || message.includes('408')) return 408;
    if (message.includes('rate limit') || message.includes('429')) return 429;
    
    // Server errors
    if (message.includes('internal server error') || message.includes('500')) return 500;
    if (message.includes('bad gateway') || message.includes('502')) return 502;
    if (message.includes('service unavailable') || message.includes('503')) return 503;
    if (message.includes('gateway timeout') || message.includes('504')) return 504;
  }
  
  // Default to 500 for unknown errors
  return 500;
}