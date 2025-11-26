import React, { useState, useEffect, useRef } from 'react';

interface LoadingButtonProps {
  children: React.ReactNode;
  loadingText: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  isLoading: boolean;
  /** Gradient classes for the progress fill (defaults to purple-to-pink) */
  progressGradient?: string;
}

type ButtonState = 'idle' | 'loading' | 'success';

const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  loadingText,
  onClick,
  disabled = false,
  className = '',
  isLoading,
  progressGradient = 'from-purple-600 to-pink-600',
}) => {
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const wasLoadingRef = useRef(false);

  // Track loading state transitions
  useEffect(() => {
    if (isLoading && !wasLoadingRef.current) {
      // Started loading
      setButtonState('loading');
    } else if (!isLoading && wasLoadingRef.current) {
      // Finished loading - show success briefly
      setButtonState('success');
      const timer = setTimeout(() => {
        setButtonState('idle');
      }, 600);
      return () => clearTimeout(timer);
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading]);

  const isDisabled = disabled || buttonState === 'loading';

  // Base button classes
  const baseClasses = `
    relative overflow-hidden
    w-full px-6 py-3 rounded-lg font-medium
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    ${buttonState === 'loading' ? 'cursor-wait' : 'disabled:cursor-not-allowed'}
    min-h-[44px] min-w-[44px]
  `;

  // State-specific classes
  const stateClasses = buttonState === 'success'
    ? 'bg-green-500 text-white'
    : `bg-gradient-to-r ${progressGradient} text-white hover:opacity-90 ${disabled && buttonState !== 'loading' ? 'opacity-50' : ''} ${buttonState === 'loading' ? 'animate-pulse' : ''}`;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${stateClasses} ${className}`}
      aria-busy={buttonState === 'loading'}
    >
      {/* Full-width progress bar overlay - visible during loading */}
      {buttonState === 'loading' && (
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          {/* Shimmer effect sliding across */}
          <div
            className="absolute inset-0 animate-shimmer-slide bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
          {/* Progress track at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
            <div className="h-full w-1/3 bg-white/80 rounded-full animate-progress-slide" />
          </div>
        </div>
      )}

      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {buttonState === 'loading' && (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {buttonState === 'success' && (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {buttonState === 'loading' ? loadingText : buttonState === 'success' ? 'Done!' : children}
      </span>
    </button>
  );
};

export default LoadingButton;
