import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../common/ErrorBoundary';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Normal rendering (no error)', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });

    it('should render complex component tree', () => {
      render(
        <ErrorBoundary>
          <section>
            <h1>Title</h1>
            <p>Description</p>
            <button>Click me</button>
          </section>
        </ErrorBoundary>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not display error UI when children render successfully', () => {
      render(
        <ErrorBoundary>
          <div>Success</div>
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    const ThrowErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
      if (shouldThrow) {
        throw new Error('Test error message');
      }
      return <div>No error</div>;
    };

    it('should catch errors from children', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should display error message', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should log error via componentDidCatch', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalled();
    });

    it('should display default error message when error message is empty', () => {
      const EmptyErrorComponent: React.FC = () => {
        const error = new Error('');
        throw error;
      };

      render(
        <ErrorBoundary>
          <EmptyErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle multiple errors in sequence', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();

      // Note: In React, once an error boundary catches an error, it stays in error state
      // until reset. This test shows the current behavior.
      rerender(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );
    });
  });

  describe('Error UI', () => {
    const ThrowErrorUI: React.FC = () => {
      throw new Error('Test error');
    };

    it('should render red background when error occurs', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowErrorUI />
        </ErrorBoundary>
      );

      const errorContainer = container.querySelector('.bg-red-50');
      expect(errorContainer).toBeInTheDocument();
    });

    it('should display error heading', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorUI />
        </ErrorBoundary>
      );

      const heading = screen.getByText('Something went wrong');
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('text-2xl', 'font-bold', 'text-red-600');
    });

    it('should render try again button', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorUI />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });

    it('should apply correct styling to try again button', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorUI />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button', { name: 'Try again' });
      expect(button).toHaveClass('bg-red-600', 'text-white', 'px-4', 'py-2', 'rounded');
    });

    it('should have white card background for error message', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowErrorUI />
        </ErrorBoundary>
      );

      const errorCard = container.querySelector('.bg-white');
      expect(errorCard).toBeInTheDocument();
      expect(errorCard).toHaveClass('rounded-lg', 'shadow-lg', 'p-6');
    });
  });

  describe('Error reset functionality', () => {
    const RecoverableError: React.FC<{ shouldError: boolean }> = ({ shouldError }) => {
      if (shouldError) {
        throw new Error('Recoverable error');
      }
      return <div>Recovered!</div>;
    };

    it('should reset error state when try again button clicked', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ErrorBoundary>
          <RecoverableError shouldError={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      const tryAgainButton = screen.getByRole('button', { name: 'Try again' });
      await user.click(tryAgainButton);

      // After clicking, error state should be reset
      // Now render with shouldError={false} to show recovery
      rerender(
        <ErrorBoundary>
          <RecoverableError shouldError={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Recovered!')).toBeInTheDocument();
    });

    it('should clear error message on reset', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ErrorBoundary>
          <RecoverableError shouldError={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Recoverable error')).toBeInTheDocument();

      const tryAgainButton = screen.getByRole('button', { name: 'Try again' });
      await user.click(tryAgainButton);

      rerender(
        <ErrorBoundary>
          <RecoverableError shouldError={false} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Recoverable error')).not.toBeInTheDocument();
    });

    it('should return to normal rendering after reset', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ErrorBoundary>
          <RecoverableError shouldError={true} />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: 'Try again' });
      await user.click(tryAgainButton);

      rerender(
        <ErrorBoundary>
          <RecoverableError shouldError={false} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    });
  });

  describe('Lifecycle methods', () => {
    const ThrowError: React.FC = () => {
      throw new Error('Test error');
    };

    it('should call getDerivedStateFromError on error', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // If getDerivedStateFromError worked, error should be caught
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should call componentDidCatch with error', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error caught by boundary'),
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('State management', () => {
    const ThrowError: React.FC = () => {
      throw new Error('State test error');
    };

    it('should initialize with hasError false', () => {
      render(
        <ErrorBoundary>
          <div>Safe content</div>
        </ErrorBoundary>
      );

      // If hasError was true, we'd see error UI
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.getByText('Safe content')).toBeInTheDocument();
    });

    it('should set hasError to true when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // hasError is true, so error UI is shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should store error object in state', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Error message is displayed from state
      expect(screen.getByText('State test error')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined children', () => {
      const { container } = render(
        <ErrorBoundary>
          {undefined}
        </ErrorBoundary>
      );

      expect(container).toBeInTheDocument();
    });

    it('should handle null children', () => {
      const { container } = render(
        <ErrorBoundary>
          {null}
        </ErrorBoundary>
      );

      expect(container).toBeInTheDocument();
    });

    it('should handle text nodes as children', () => {
      render(
        <ErrorBoundary>
          Plain text content
        </ErrorBoundary>
      );

      expect(screen.getByText('Plain text content')).toBeInTheDocument();
    });

    it('should handle boolean values in children', () => {
      const { container } = render(
        <ErrorBoundary>
          {true}
          {false}
        </ErrorBoundary>
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    const ThrowError: React.FC = () => {
      throw new Error('Accessibility test');
    };

    it('should have semantic heading in error state', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Something went wrong');
    });

    it('should have accessible button in error state', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button', { name: 'Try again' });
      expect(button).toBeInTheDocument();
    });
  });
});
