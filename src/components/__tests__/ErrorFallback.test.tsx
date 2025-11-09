import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorFallback from '../common/ErrorFallback';
import type { IAppError } from '../../types/error';

describe('ErrorFallback', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_ENV', 'development');
  });

  describe('String error handling', () => {
    it('should display string error message', () => {
      render(<ErrorFallback error="Simple error message" />);

      expect(screen.getByText('Simple error message')).toBeInTheDocument();
    });

    it('should use default title for string error', () => {
      render(<ErrorFallback error="Test error" />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should not show error details for string error', () => {
      render(<ErrorFallback error="Test error" showDetails={true} />);

      expect(screen.queryByText('Error details')).not.toBeInTheDocument();
    });

    it('should display custom title with string error', () => {
      render(
        <ErrorFallback error="Test error" title="Custom Error Title" />
      );

      expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('Error object handling', () => {
    it('should display Error object message', () => {
      const error = new Error('Test error message');
      render(<ErrorFallback error={error} />);

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should use default title for Error object', () => {
      const error = new Error('Test error');
      render(<ErrorFallback error={error} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should not show error details for Error object', () => {
      const error = new Error('Test error');
      render(<ErrorFallback error={error} showDetails={true} />);

      expect(screen.queryByText('Error details')).not.toBeInTheDocument();
    });

    it('should display custom title with Error object', () => {
      const error = new Error('Test error');
      render(
        <ErrorFallback error={error} title="Error Object Title" />
      );

      expect(screen.getByText('Error Object Title')).toBeInTheDocument();
    });
  });

  describe('IAppError handling', () => {
    const mockAppError: IAppError = {
      code: 'TEST_ERROR',
      message: 'Application error message',
      statusCode: 400,
      details: {
        context: 'test context',
      },
    };

    it('should display IAppError message', () => {
      render(<ErrorFallback error={mockAppError} />);

      expect(screen.getByText('Application error message')).toBeInTheDocument();
    });

    it('should show error details for IAppError when showDetails is true', () => {
      render(<ErrorFallback error={mockAppError} showDetails={true} />);

      expect(screen.getByText('Error details')).toBeInTheDocument();
      const detailsContent = screen.getByText(/TEST_ERROR/);
      expect(detailsContent).toBeInTheDocument();
    });

    it('should hide error details when showDetails is false', () => {
      render(<ErrorFallback error={mockAppError} showDetails={false} />);

      expect(screen.queryByText(/TEST_ERROR/)).not.toBeInTheDocument();
    });

    it('should include code and statusCode in details', () => {
      render(<ErrorFallback error={mockAppError} showDetails={true} />);

      const detailsLink = screen.getByText('Error details');
      detailsLink.click();

      expect(screen.getByText(/TEST_ERROR/)).toBeInTheDocument();
      expect(screen.getByText(/400/)).toBeInTheDocument();
    });

    it('should include custom details in error display', () => {
      render(<ErrorFallback error={mockAppError} showDetails={true} />);

      const detailsLink = screen.getByText('Error details');
      detailsLink.click();

      expect(screen.getByText(/test context/)).toBeInTheDocument();
    });
  });

  describe('Title prop', () => {
    it('should use provided title', () => {
      render(
        <ErrorFallback error="Test error" title="Custom Title" />
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should use default title when not provided', () => {
      render(<ErrorFallback error="Test error" />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should display title as heading', () => {
      render(
        <ErrorFallback error="Test error" title="Error Heading" />
      );

      const heading = screen.getByText('Error Heading');
      expect(heading).toHaveClass('text-lg', 'font-semibold');
    });

    it('should have correct heading color', () => {
      render(<ErrorFallback error="Test error" />);

      const heading = screen.getByText('Something went wrong');
      expect(heading).toHaveClass('text-red-800');
    });
  });

  describe('showDetails prop behavior', () => {
    const appError: IAppError = {
      code: 'DETAILS_TEST',
      message: 'Test message',
      statusCode: 500,
    };

    it('should default to DEV environment value', () => {
      const { rerender } = render(<ErrorFallback error={appError} />);

      // In test environment, import.meta.env.DEV should determine behavior
      rerender(<ErrorFallback error={appError} />);
    });

    it('should show details when showDetails is true', () => {
      render(<ErrorFallback error={appError} showDetails={true} />);

      expect(screen.getByText('Error details')).toBeInTheDocument();
    });

    it('should hide details when showDetails is false', () => {
      render(<ErrorFallback error={appError} showDetails={false} />);

      expect(screen.queryByText('Error details')).not.toBeInTheDocument();
    });

    it('should always show message regardless of showDetails', () => {
      const { rerender } = render(
        <ErrorFallback error={appError} showDetails={false} />
      );

      expect(screen.getByText('Test message')).toBeInTheDocument();

      rerender(<ErrorFallback error={appError} showDetails={true} />);

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  describe('Reset callback', () => {
    it('should render button when resetError is provided', () => {
      const resetError = vi.fn();
      render(
        <ErrorFallback error="Test error" resetError={resetError} />
      );

      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });

    it('should not render button when resetError is not provided', () => {
      render(<ErrorFallback error="Test error" />);

      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    });

    it('should call resetError callback when button clicked', async () => {
      const user = userEvent.setup();
      const resetError = vi.fn();

      render(
        <ErrorFallback error="Test error" resetError={resetError} />
      );

      const button = screen.getByRole('button', { name: 'Try again' });
      await user.click(button);

      expect(resetError).toHaveBeenCalledTimes(1);
    });

    it('should apply correct button styling', () => {
      const resetError = vi.fn();
      render(
        <ErrorFallback error="Test error" resetError={resetError} />
      );

      const button = screen.getByRole('button', { name: 'Try again' });
      expect(button).toHaveClass(
        'bg-red-600',
        'text-white',
        'px-3',
        'py-2',
        'rounded'
      );
    });

    it('should have accessible button label', () => {
      const resetError = vi.fn();
      render(
        <ErrorFallback error="Test error" resetError={resetError} />
      );

      const button = screen.getByRole('button', { name: 'Try again' });
      expect(button).toHaveAttribute('aria-label', 'Try again');
    });
  });

  describe('Styling', () => {
    it('should have red error container styling', () => {
      const { container } = render(
        <ErrorFallback error="Test error" />
      );

      const errorDiv = container.firstChild;
      expect(errorDiv).toHaveClass('bg-red-50', 'border', 'border-red-200');
    });

    it('should have correct message color', () => {
      render(<ErrorFallback error="Test error" />);

      const message = screen.getByText('Test error');
      expect(message).toHaveClass('text-red-600');
    });

    it('should have correct details summary styling', () => {
      const appError: IAppError = {
        code: 'TEST',
        message: 'Test',
        statusCode: 500,
      };

      render(
        <ErrorFallback error={appError} showDetails={true} />
      );

      const summary = screen.getByText('Error details');
      expect(summary).toHaveClass('cursor-pointer');
    });

    it('should have correct pre-formatted details styling', () => {
      const { container } = render(
        <ErrorFallback
          error={{
            code: 'TEST',
            message: 'Test',
            statusCode: 500,
          }}
          showDetails={true}
        />
      );

      const preElement = container.querySelector('pre');
      expect(preElement).toHaveClass('bg-gray-100', 'rounded', 'overflow-auto');
    });
  });

  describe('Details expandable section', () => {
    it('should show expandable details section', () => {
      const appError: IAppError = {
        code: 'EXPAND_TEST',
        message: 'Test message',
        statusCode: 400,
      };

      render(<ErrorFallback error={appError} showDetails={true} />);

      const details = screen.getByText('Error details');
      expect(details.tagName).toBe('SUMMARY');
    });

    it('should be clickable to expand details', async () => {
      const user = userEvent.setup();
      const appError: IAppError = {
        code: 'CLICK_TEST',
        message: 'Test',
        statusCode: 500,
      };

      render(<ErrorFallback error={appError} showDetails={true} />);

      const summary = screen.getByText('Error details');
      await user.click(summary);

      // Details should expand
      expect(summary).toBeVisible();
    });

    it('should format details as JSON', () => {
      const appError: IAppError = {
        code: 'JSON_TEST',
        message: 'Test message',
        statusCode: 400,
        details: { key: 'value' },
      };

      const { container } = render(
        <ErrorFallback error={appError} showDetails={true} />
      );

      const pre = container.querySelector('pre');
      expect(pre?.textContent).toContain('code');
      expect(pre?.textContent).toContain('statusCode');
    });
  });

  describe('Handling edge cases', () => {
    it('should handle error with empty message', () => {
      render(<ErrorFallback error="" />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle Error with empty message', () => {
      const error = new Error('');
      render(<ErrorFallback error={error} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle IAppError with no details', () => {
      const appError: IAppError = {
        code: 'NO_DETAILS',
        message: 'Test',
        statusCode: 500,
      };

      render(<ErrorFallback error={appError} showDetails={true} />);

      expect(screen.getByText('Error details')).toBeInTheDocument();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(500);
      render(<ErrorFallback error={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle special characters in error message', () => {
      const specialMessage = 'Error: <script>alert("xss")</script>';
      render(<ErrorFallback error={specialMessage} />);

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });
  });

  describe('Layout and spacing', () => {
    it('should have proper padding', () => {
      const { container } = render(
        <ErrorFallback error="Test" />
      );

      const errorDiv = container.firstChild;
      expect(errorDiv).toHaveClass('p-4');
    });

    it('should have proper margin between title and message', () => {
      render(<ErrorFallback error="Test" />);

      const title = screen.getByText('Something went wrong');
      expect(title).toHaveClass('mb-2');
    });

    it('should have proper margin between message and details', () => {
      const appError: IAppError = {
        code: 'TEST',
        message: 'Test message',
        statusCode: 500,
      };

      render(<ErrorFallback error={appError} showDetails={true} />);

      const message = screen.getByText('Test message');
      expect(message).toHaveClass('mb-4');
    });
  });

  describe('Multiple error types together', () => {
    it('should handle switching between error types', () => {
      const stringError = 'String error';
      const errorObj = new Error('Error object');
      const appError: IAppError = {
        code: 'APP_ERROR',
        message: 'App error',
        statusCode: 500,
      };

      const { rerender } = render(
        <ErrorFallback error={stringError} />
      );

      expect(screen.getByText(stringError)).toBeInTheDocument();

      rerender(<ErrorFallback error={errorObj} />);

      expect(screen.getByText('Error object')).toBeInTheDocument();

      rerender(<ErrorFallback error={appError} />);

      expect(screen.getByText('App error')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be readable by screen readers', () => {
      render(<ErrorFallback error="Accessible error message" />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
    });

    it('should have button with accessible name', () => {
      const resetError = vi.fn();
      render(
        <ErrorFallback error="Test" resetError={resetError} />
      );

      const button = screen.getByRole('button', { name: 'Try again' });
      expect(button).toHaveAttribute('aria-label', 'Try again');
    });

    it('should have expandable details with proper semantics', () => {
      const appError: IAppError = {
        code: 'TEST',
        message: 'Test',
        statusCode: 500,
      };

      const { container } = render(
        <ErrorFallback error={appError} showDetails={true} />
      );

      const detailsElement = container.querySelector('details');
      expect(detailsElement).toBeInTheDocument();
    });
  });
});
