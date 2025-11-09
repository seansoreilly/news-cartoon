import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppErrorHandler } from '../errorHandler';
import type { IAppError } from '../../types/error';

describe('AppErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('handleError', () => {
    it('should convert string error to IAppError', () => {
      const errorMessage = 'Something went wrong';
      const result = AppErrorHandler.handleError(errorMessage);

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe(errorMessage);
      expect(result.statusCode).toBe(500);
    });

    it('should convert Error object to IAppError', () => {
      const error = new Error('Test error message');
      const result = AppErrorHandler.handleError(error);

      expect(result.code).toBe('ERROR');
      expect(result.message).toBe('Test error message');
      expect(result.statusCode).toBe(500);
      expect(result.details?.name).toBe('Error');
    });

    it('should handle IAppError directly', () => {
      const appError: IAppError = {
        code: 'NEWS_ERROR',
        message: 'Failed to fetch news',
        statusCode: 404,
      };

      const result = AppErrorHandler.handleError(appError);

      expect(result.code).toBe('NEWS_ERROR');
      expect(result.message).toBe('Failed to fetch news');
      expect(result.statusCode).toBe(404);
    });

    it('should handle unknown error types gracefully', () => {
      const result = AppErrorHandler.handleError(null);

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('An unexpected error occurred');
      expect(result.statusCode).toBe(500);
    });

    it('should log errors to console', () => {
      const error = new Error('Test error');
      AppErrorHandler.handleError(error);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getUserMessage', () => {
    it('should return user-friendly message for location errors', () => {
      const error: IAppError = {
        code: 'LOCATION_ERROR',
        message: 'Internal message',
        statusCode: 400,
      };

      const message = AppErrorHandler.getUserMessage(error);

      expect(message).toBe(
        'We could not detect your location. Please enter it manually.'
      );
    });

    it('should return user-friendly message for news errors', () => {
      const error: IAppError = {
        code: 'NEWS_ERROR',
        message: 'Internal message',
        statusCode: 400,
      };

      const message = AppErrorHandler.getUserMessage(error);

      expect(message).toBe(
        'We had trouble fetching the news. Please try again later.'
      );
    });

    it('should return user-friendly message for cartoon errors', () => {
      const error: IAppError = {
        code: 'CARTOON_ERROR',
        message: 'Internal message',
        statusCode: 400,
      };

      const message = AppErrorHandler.getUserMessage(error);

      expect(message).toBe(
        'We could not generate cartoon concepts. Please try again.'
      );
    });

    it('should return user-friendly message for rate limit errors', () => {
      const error: IAppError = {
        code: 'RATE_LIMIT_ERROR',
        message: 'Internal message',
        statusCode: 429,
      };

      const message = AppErrorHandler.getUserMessage(error);

      expect(message).toBe('Too many requests. Please wait a moment and try again.');
    });

    it('should return user-friendly message for validation errors', () => {
      const error: IAppError = {
        code: 'VALIDATION_ERROR',
        message: 'Internal message',
        statusCode: 400,
      };

      const message = AppErrorHandler.getUserMessage(error);

      expect(message).toBe(
        'The information you provided is invalid. Please check and try again.'
      );
    });

    it('should return original message for unknown error codes', () => {
      const error: IAppError = {
        code: 'UNKNOWN_CODE',
        message: 'Original error message',
        statusCode: 500,
      };

      const message = AppErrorHandler.getUserMessage(error);

      expect(message).toBe('Original error message');
    });
  });

  describe('isRetryable', () => {
    it('should identify retryable status codes', () => {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];

      retryableStatuses.forEach((status) => {
        const error: IAppError = {
          code: 'ERROR',
          message: 'Error',
          statusCode: status,
        };

        expect(AppErrorHandler.isRetryable(error)).toBe(true);
      });
    });

    it('should identify retryable error codes', () => {
      const retryableCodes = ['RATE_LIMIT_ERROR', 'NEWS_ERROR'];

      retryableCodes.forEach((code) => {
        const error: IAppError = {
          code,
          message: 'Error',
          statusCode: 400,
        };

        expect(AppErrorHandler.isRetryable(error)).toBe(true);
      });
    });

    it('should identify non-retryable errors', () => {
      const error: IAppError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        statusCode: 400,
      };

      expect(AppErrorHandler.isRetryable(error)).toBe(false);
    });
  });

  describe('Error Type Guards', () => {
    it('should identify rate limit errors', () => {
      const error: IAppError = {
        code: 'RATE_LIMIT_ERROR',
        message: 'Too many requests',
        statusCode: 429,
      };

      expect(AppErrorHandler.isRateLimitError(error)).toBe(true);
    });

    it('should identify location errors', () => {
      const error: IAppError = {
        code: 'LOCATION_ERROR',
        message: 'Location not found',
        statusCode: 400,
      };

      expect(AppErrorHandler.isLocationError(error)).toBe(true);
    });

    it('should identify news errors', () => {
      const error: IAppError = {
        code: 'NEWS_ERROR',
        message: 'News fetch failed',
        statusCode: 400,
      };

      expect(AppErrorHandler.isNewsError(error)).toBe(true);
    });

    it('should identify cartoon errors', () => {
      const error: IAppError = {
        code: 'CARTOON_ERROR',
        message: 'Generation failed',
        statusCode: 400,
      };

      expect(AppErrorHandler.isCartoonError(error)).toBe(true);
    });

    it('should reject non-matching error types', () => {
      const error: IAppError = {
        code: 'NEWS_ERROR',
        message: 'News error',
        statusCode: 400,
      };

      expect(AppErrorHandler.isRateLimitError(error)).toBe(false);
      expect(AppErrorHandler.isLocationError(error)).toBe(false);
      expect(AppErrorHandler.isCartoonError(error)).toBe(false);
    });
  });

  describe('Error Details Preservation', () => {
    it('should preserve error details in development mode', () => {
      const error = new Error('Test error');
      error.name = 'CustomError';

      const result = AppErrorHandler.handleError(error);

      expect(result.details?.name).toBe('CustomError');
      // Stack is included in dev mode, but we can't guarantee it in all environments
      if (result.details?.stack) {
        expect(typeof result.details.stack).toBe('string');
      }
    });

    it('should handle errors with complex messages', () => {
      const complexMessage = 'Error with special chars: !@#$%^&*()';
      const error = new Error(complexMessage);

      const result = AppErrorHandler.handleError(error);

      expect(result.message).toBe(complexMessage);
    });
  });
});
