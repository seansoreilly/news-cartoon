export type IAppError = {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
};

export type ILocationError = IAppError;

export type INewsError = IAppError;

export type ICartoonError = IAppError;

export type IRateLimitError = IAppError & {
  retryAfter: number;
};

export type IValidationError = IAppError & {
  fields?: Record<string, string>;
};

export type ErrorHandler = (error: IAppError) => void;

// Utility function to create app errors
export function createAppError(
  code: string,
  message: string,
  statusCode = 500,
  details?: Record<string, unknown>
): IAppError {
  return { code, message, statusCode, details };
}

export function createLocationError(
  message: string,
  details?: Record<string, unknown>
): ILocationError {
  return createAppError('LOCATION_ERROR', message, 400, details) as ILocationError;
}

export function createNewsError(
  message: string,
  details?: Record<string, unknown>
): INewsError {
  return createAppError('NEWS_ERROR', message, 400, details) as INewsError;
}

export function createCartoonError(
  message: string,
  details?: Record<string, unknown>
): ICartoonError {
  return createAppError('CARTOON_ERROR', message, 500, details) as ICartoonError;
}

export function createRateLimitError(
  retryAfter: number,
  details?: Record<string, unknown>
): IRateLimitError {
  return {
    ...createAppError('RATE_LIMIT_ERROR', 'Rate limit exceeded', 429, details),
    retryAfter,
  } as IRateLimitError;
}

export function createValidationError(
  message: string,
  fields?: Record<string, string>
): IValidationError {
  return {
    ...createAppError('VALIDATION_ERROR', message, 400, { fields }),
    fields,
  } as IValidationError;
}
