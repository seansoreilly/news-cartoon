import React from 'react';
import type { IAppError } from '../../types/error';

interface ErrorFallbackProps {
  error: IAppError | Error | string;
  resetError?: () => void;
  title?: string;
  showDetails?: boolean;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  title = 'Something went wrong',
  showDetails = import.meta.env.DEV,
}) => {
  const getErrorMessage = (): string => {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    // IAppError type
    return (error as IAppError).message || 'An unexpected error occurred';
  };

  const getErrorDetails = (): Record<string, unknown> | null => {
    if (typeof error === 'string' || error instanceof Error) {
      return null;
    }

    const appError = error as IAppError;
    return {
      code: appError.code,
      statusCode: appError.statusCode,
      ...appError.details,
    };
  };

  const errorMessage = getErrorMessage();
  const errorDetails = showDetails ? getErrorDetails() : null;

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-lg font-semibold text-red-800 mb-2">{title}</h3>
      <p className="text-red-600 mb-4">{errorMessage}</p>

      {errorDetails && (
        <details className="text-sm text-gray-700 mb-4">
          <summary className="cursor-pointer hover:underline">Error details</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
            {JSON.stringify(errorDetails, null, 2)}
          </pre>
        </details>
      )}

      {resetError && (
        <button
          onClick={resetError}
          className="text-sm bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition-colors"
          aria-label="Try again"
        >
          Try again
        </button>
      )}
    </div>
  );
};

export default ErrorFallback;
