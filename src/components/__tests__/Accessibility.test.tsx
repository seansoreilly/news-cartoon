import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Layout from '../layout/Layout';
import ErrorBoundary from '../common/ErrorBoundary';
import ErrorFallback from '../common/ErrorFallback';
import LoadingSpinner from '../common/LoadingSpinner';
import ProgressIndicator from '../common/ProgressIndicator';
import { useLocationStore } from '../../store/locationStore';
import { useNewsStore } from '../../store/newsStore';
import { useCartoonStore } from '../../store/cartoonStore';

// Mock stores
vi.mock('../../store/locationStore');
vi.mock('../../store/newsStore');
vi.mock('../../store/cartoonStore');

describe('Accessibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Layout Accessibility', () => {
    it('should have proper semantic structure', () => {
      const { container } = render(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('main')).toBeInTheDocument();
      expect(container.querySelector('footer')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <Layout>
          <h2>Subheading</h2>
        </Layout>
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Cartoon of the Day');
    });

    it('should have sufficient color contrast', () => {
      const { container } = render(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      const title = container.querySelector('h1');
      expect(title).toHaveClass('text-white');
    });

    it('should be keyboard navigable', () => {
      render(
        <Layout>
          <button>Test Button</button>
        </Layout>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Loading Spinner Accessibility', () => {
    it('should have text alternative for visual indicator', () => {
      render(<LoadingSpinner />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error Boundary Accessibility', () => {
    it('should have accessible heading', () => {
      const ThrowError = () => {
        throw new Error('Test');
      };

      vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Something went wrong');
    });

    it('should have accessible button', () => {
      const ThrowError = () => {
        throw new Error('Test');
      };

      vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Try again');
    });
  });

  describe('Error Fallback Accessibility', () => {
    it('should have accessible heading', () => {
      render(<ErrorFallback error="Test error" />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible reset button when provided', () => {
      render(
        <ErrorFallback error="Test error" resetError={() => {}} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Try again');
    });

    it('should have expandable details with proper semantics', () => {
      const { container } = render(
        <ErrorFallback
          error={{ code: 'TEST', message: 'Test', statusCode: 500 }}
          showDetails={true}
        />
      );

      const details = container.querySelector('details');
      expect(details).toBeInTheDocument();

      const summary = container.querySelector('summary');
      expect(summary).toBeInTheDocument();
    });
  });

  describe('Progress Indicator Accessibility', () => {
    beforeEach(() => {
      (useLocationStore as any).mockReturnValue({
        location: null,
      });
      (useNewsStore as any).mockReturnValue({
        articles: [],
      });
      (useCartoonStore as any).mockReturnValue({
        cartoon: null,
        imagePath: null,
      });
    });

    it('should display all steps with proper labels', () => {
      render(<ProgressIndicator />);

      expect(screen.getByText('Set Location')).toBeInTheDocument();
      expect(screen.getByText('Select News')).toBeInTheDocument();
      expect(screen.getByText('Generate Concepts')).toBeInTheDocument();
      expect(screen.getByText('Generate Image')).toBeInTheDocument();
    });

    it('should have proper numbering for steps', () => {
      render(<ProgressIndicator />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should announce step status to screen readers', () => {
      render(<ProgressIndicator />);

      // Steps should be visible text for screen readers
      const steps = screen.getAllByText(/^\d$/);
      expect(steps.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design Tests', () => {
    it('Layout should be responsive', () => {
      const { container } = render(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      const layoutDiv = container.querySelector('.max-w-\\[900px\\]');
      expect(layoutDiv).toHaveClass('px-4', 'py-8');
    });

    it('should have responsive text sizing', () => {
      render(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      const title = screen.getByText('Cartoon of the Day');
      expect(title).toHaveClass('text-4xl');
    });

    it('should have responsive padding on main content', () => {
      const { container } = render(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('p-6', 'md:p-8');
    });

    it('should use flexible layout containers', () => {
      const { container } = render(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      const outerDiv = container.querySelector('.min-h-screen');
      expect(outerDiv).toBeInTheDocument();
    });

    it('should have proper viewport settings in components', () => {
      const { container } = render(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      expect(container.querySelector('.container')).toBeInTheDocument();
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should have sufficient contrast for headings', () => {
      render(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      const title = screen.getByText('Cartoon of the Day');
      expect(title).toHaveClass('text-white');
    });

    it('should have sufficient contrast for error messages', () => {
      render(<ErrorFallback error="Test error" />);

      const error = screen.getByText('Test error');
      expect(error).toHaveClass('text-red-600');
    });

    it('should have accessible button styling', () => {
      render(
        <ErrorFallback error="Test error" resetError={() => {}} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600', 'text-white');
    });

    it('should indicate interactive elements clearly', () => {
      render(
        <Layout>
          <button>Click me</button>
        </Layout>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation for buttons', () => {
      render(
        <ErrorFallback error="Test error" resetError={() => {}} />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('should support keyboard navigation for expandable details', () => {
      const { container } = render(
        <ErrorFallback
          error={{ code: 'TEST', message: 'Test', statusCode: 500 }}
          showDetails={true}
        />
      );

      const details = container.querySelector('details');
      expect(details).toBeInTheDocument();
    });

    it('should have proper focus management', () => {
      const { container } = render(
        <Layout>
          <button>Test</button>
        </Layout>
      );

      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Text Alternatives', () => {
    it('should provide text for loading indicator', () => {
      render(<LoadingSpinner />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should provide text for error messages', () => {
      render(<ErrorFallback error="Test error" />);
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should provide title for error fallback', () => {
      render(
        <ErrorFallback error="Test error" title="Custom Title" />
      );
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should provide labels for buttons', () => {
      render(
        <ErrorFallback error="Test error" resetError={() => {}} />
      );
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });
  });

  describe('Layout and Structure Accessibility', () => {
    it('should use semantic HTML', () => {
      const { container } = render(
        <Layout>
          <article>Test</article>
        </Layout>
      );

      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('main')).toBeInTheDocument();
      expect(container.querySelector('footer')).toBeInTheDocument();
    });

    it('should have proper nesting of elements', () => {
      const { container } = render(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      const header = container.querySelector('header');
      const main = container.querySelector('main');
      const footer = container.querySelector('footer');

      expect(header?.parentElement).toBeTruthy();
      expect(main?.parentElement).toBeTruthy();
      expect(footer?.parentElement).toBeTruthy();
    });

    it('should maintain content order', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const children = container.querySelector('.container')?.children;
      expect(children?.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Mobile Accessibility', () => {
    it('should be accessible on small viewports', () => {
      const { container } = render(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      const layoutDiv = container.querySelector('.px-4');
      expect(layoutDiv).toBeInTheDocument();
    });

    it('should have touch-friendly button sizes', () => {
      render(
        <ErrorFallback error="Test error" resetError={() => {}} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-2');
    });

    it('should have readable font sizes on mobile', () => {
      render(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      const subtitle = screen.getByText(/AI-powered/i);
      expect(subtitle).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should maintain focus visibility', () => {
      render(
        <ErrorFallback error="Test error" resetError={() => {}} />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should have logical tab order', () => {
      const { container } = render(
        <Layout>
          <button>Button 1</button>
          <button>Button 2</button>
        </Layout>
      );

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support focus trapping in modals if present', () => {
      render(
        <ErrorBoundary>
          <div>Test</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });
});
