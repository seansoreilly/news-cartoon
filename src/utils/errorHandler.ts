import type { IAppError, ILocationError, INewsError, ICartoonError, IRateLimitError } from '../types/error';

/**
 * Central error handler for the application
 * Logs errors and provides user-friendly messages
 */
export class AppErrorHandler {
  private static isDevelopment = import.meta.env.DEV;

  /**
   * Handle any application error and return a user-friendly message
   */
  static handleError(error: unknown): IAppError {
    if (typeof error === 'string') {
      return {
        code: 'UNKNOWN_ERROR',
        message: error,
        statusCode: 500,
      };
    }

    if (error instanceof Error) {
      const appError = this.convertErrorToAppError(error);
      this.logError(appError);
      return appError;
    }

    if (this.isAppError(error)) {
      this.logError(error as IAppError);
      return error as IAppError;
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    };
  }

  /**
   * Convert a standard Error to IAppError
   */
  private static convertErrorToAppError(error: Error): IAppError {
    const message = error.message || 'An unexpected error occurred';

    return {
      code: 'ERROR',
      message,
      statusCode: 500,
      details: {
        name: error.name,
        stack: this.isDevelopment ? error.stack : undefined,
      },
    };
  }

  /**
   * Type guard to check if an object is an IAppError
   */
  private static isAppError(error: unknown): error is IAppError {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const obj = error as Record<string, unknown>;
    return (
      typeof obj.code === 'string' &&
      typeof obj.message === 'string' &&
      typeof obj.statusCode === 'number'
    );
  }

  /**
   * Log error to console and optionally to external service
   */
  private static logError(error: IAppError): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };

    console.error('[AppError]', logEntry);
  }

  /**
   * Get user-friendly error message for display
   */
  static getUserMessage(error: IAppError): string {
    const messageMap: Record<string, string> = {
      LOCATION_ERROR: 'We could not detect your location. Please enter it manually.',
      NEWS_ERROR: 'We had trouble fetching the news. Please try again later.',
      CARTOON_ERROR: 'We could not generate cartoon concepts. Please try again.',
      RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
      VALIDATION_ERROR: 'The information you provided is invalid. Please check and try again.',
      ERROR: 'An unexpected error occurred. Please try again.',
    };

    return messageMap[error.code] || error.message;
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: IAppError): boolean {
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const retryableCodes = ['RATE_LIMIT_ERROR', 'NEWS_ERROR'];

    return (
      retryableStatusCodes.includes(error.statusCode) ||
      retryableCodes.includes(error.code)
    );
  }

  /**
   * Check if error is a rate limit error
   */
  static isRateLimitError(error: IAppError): error is IRateLimitError {
    return error.code === 'RATE_LIMIT_ERROR';
  }

  /**
   * Check if error is a location error
   */
  static isLocationError(error: IAppError): error is ILocationError {
    return error.code === 'LOCATION_ERROR';
  }

  /**
   * Check if error is a news error
   */
  static isNewsError(error: IAppError): error is INewsError {
    return error.code === 'NEWS_ERROR';
  }

  /**
   * Check if error is a cartoon error
   */
  static isCartoonError(error: IAppError): error is ICartoonError {
    return error.code === 'CARTOON_ERROR';
  }
}

export default AppErrorHandler;
