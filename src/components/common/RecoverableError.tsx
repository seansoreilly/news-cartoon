import React, { useEffect, useState } from 'react';
import type { IAppError } from '../../types/error';

interface RecoverableErrorProps {
  error: IAppError | string | null;
  onRetry?: () => void;
  className?: string;
}

interface ActionConfig {
  label: string;
  hint?: string;
  href?: string;
  countdown?: number;
}

const getActionForCode = (code: string, details?: Record<string, unknown>): ActionConfig | null => {
  switch (code) {
    case 'RATE_LIMIT_ERROR': {
      const retryAfter = typeof details?.retryAfter === 'number' ? details.retryAfter : 0;
      return {
        label: 'Try again',
        hint: 'Cooling down — please wait',
        countdown: Math.ceil(retryAfter / 1000),
      };
    }
    case 'LOCATION_ERROR':
      return { label: 'Try a different location', hint: 'Edit the location field above' };
    case 'NEWS_ERROR':
      return { label: 'Refresh news', hint: 'Re-fetch the latest articles' };
    case 'CARTOON_ERROR':
      return { label: 'Try again', hint: 'You can pick a different concept if it keeps failing' };
    case 'GEMINI_API_KEY_MISSING':
      return { label: 'Try again', hint: 'The server is missing its GOOGLE_API_KEY environment variable' };
    case 'VALIDATION_ERROR':
      return null;
    default:
      return { label: 'Try again' };
  }
};

const normalizeError = (error: IAppError | string): { code: string; message: string; details?: Record<string, unknown> } => {
  if (typeof error === 'string') {
    return { code: 'UNKNOWN', message: error };
  }
  return { code: error.code, message: error.message, details: error.details };
};

const RecoverableError: React.FC<RecoverableErrorProps> = ({ error, onRetry, className = '' }) => {
  const normalized = error ? normalizeError(error) : null;
  const action = normalized ? getActionForCode(normalized.code, normalized.details) : null;
  const [remaining, setRemaining] = useState<number>(action?.countdown ?? 0);

  useEffect(() => {
    setRemaining(action?.countdown ?? 0);
  }, [action?.countdown]);

  useEffect(() => {
    if (!action?.countdown || remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [action?.countdown, remaining]);

  if (!normalized) return null;

  const isDisabled = (action?.countdown ?? 0) > 0 && remaining > 0;
  const actionLabel =
    action?.countdown && remaining > 0 ? `Try again in ${remaining}s` : action?.label ?? 'Try again';

  return (
    <div
      role="alert"
      className={`bg-white/70 backdrop-blur-sm border-l-4 border-red-500 rounded-lg shadow-sm p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-900">{normalized.message}</p>
          {action?.hint && (
            <p className="text-xs text-red-700/80 mt-1">{action.hint}</p>
          )}
          {action && (
            <div className="mt-3 flex flex-wrap gap-2">
              {action.href ? (
                <a
                  href={action.href}
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors min-h-[36px]"
                >
                  {action.label}
                </a>
              ) : onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isDisabled}
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[36px]"
                >
                  {actionLabel}
                </button>
              ) : (
                <span className="text-xs text-red-700 italic">{actionLabel}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecoverableError;
