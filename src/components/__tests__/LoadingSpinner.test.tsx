import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../common/LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render loading spinner component', () => {
      const { container } = render(<LoadingSpinner />);
      expect(container).toBeInTheDocument();
    });

    it('should display "Loading..." text', () => {
      render(<LoadingSpinner />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render spinning animation container', () => {
      const { container } = render(<LoadingSpinner />);
      const spinningDiv = container.querySelector('.animate-spin');
      expect(spinningDiv).toBeInTheDocument();
    });
  });

  describe('Structure', () => {
    it('should have flex container with center alignment', () => {
      const { container } = render(<LoadingSpinner />);
      const flexContainer = container.firstChild;
      expect(flexContainer).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should have relative positioned spinner wrapper', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.relative');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('w-16', 'h-16');
    });

    it('should have static background border', () => {
      const { container } = render(<LoadingSpinner />);
      const borders = container.querySelectorAll('.rounded-full');
      expect(borders.length).toBeGreaterThanOrEqual(2);

      // First border is static gray background
      const staticBorder = borders[0];
      expect(staticBorder).toHaveClass('border-4', 'border-gray-200');
    });

    it('should have animated colored border', () => {
      const { container } = render(<LoadingSpinner />);
      const animatedBorder = container.querySelector('.animate-spin');
      expect(animatedBorder).toHaveClass(
        'rounded-full',
        'border-4',
        'border-transparent',
        'border-t-purple-600',
        'border-r-purple-600'
      );
    });
  });

  describe('Styling', () => {
    it('should apply correct padding', () => {
      const { container } = render(<LoadingSpinner />);
      const outerDiv = container.firstChild;
      expect(outerDiv).toHaveClass('py-12');
    });

    it('should apply correct spinner dimensions', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.relative');
      expect(spinner).toHaveClass('w-16', 'h-16');
    });

    it('should apply correct text styling', () => {
      render(<LoadingSpinner />);
      const text = screen.getByText('Loading...');
      expect(text).toHaveClass('ml-4', 'text-gray-600');
    });

    it('should apply purple color to spinner', () => {
      const { container } = render(<LoadingSpinner />);
      const animatedBorder = container.querySelector('.animate-spin');
      expect(animatedBorder).toHaveClass('border-t-purple-600', 'border-r-purple-600');
    });

    it('should have absolute positioning for borders', () => {
      const { container } = render(<LoadingSpinner />);
      const borders = container.querySelectorAll('.absolute');
      expect(borders.length).toBeGreaterThanOrEqual(2);
      borders.forEach((border) => {
        expect(border).toHaveClass('inset-0');
      });
    });
  });

  describe('Animation', () => {
    it('should have spin animation class', () => {
      const { container: animContainer } = render(<LoadingSpinner />);
      const animatedBorder = animContainer.querySelector('.animate-spin');
      expect(animatedBorder).toHaveClass('animate-spin');
    });

    it('should only apply animation to colored border, not static border', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.relative');
      const children = spinner?.querySelectorAll(':scope > div');

      expect(children?.length).toBe(2);

      // First child (static) should not have animation
      expect(children?.[0]).not.toHaveClass('animate-spin');

      // Second child (animated) should have animation
      expect(children?.[1]).toHaveClass('animate-spin');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible to screen readers', () => {
      render(<LoadingSpinner />);
      // Screen readers can access the "Loading..." text
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should have semantic text content', () => {
      render(<LoadingSpinner />);
      const loadingText = screen.getByText('Loading...');
      expect(loadingText.textContent).toBe('Loading...');
    });
  });

  describe('Props', () => {
    it('should not accept any props', () => {
      // LoadingSpinner is a functional component with no props
      // This is more of a documentation test
      const { container } = render(<LoadingSpinner />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Visual Hierarchy', () => {
    it('should place spinner before text', () => {
      const { container } = render(<LoadingSpinner />);
      const flexContainer = container.querySelector('.flex');
      const children = flexContainer?.childNodes;

      expect(children?.length).toBe(2);

      // First child is the spinner (relative positioned container)
      const spinner = (children?.[0] as Element)?.classList.contains('relative');
      expect(spinner).toBe(true);

      // Second child is the text span
      const textSpan = children?.[1] as Element;
      expect(textSpan.tagName).toBe('SPAN');
    });
  });

  describe('Consistency', () => {
    it('should render consistently across multiple mounts', () => {
      const { container: container1 } = render(<LoadingSpinner />);
      const spinner1 = container1.querySelector('.animate-spin');

      const { container: container2 } = render(<LoadingSpinner />);
      const spinner2 = container2.querySelector('.animate-spin');

      expect(spinner1?.className).toBe(spinner2?.className);
    });
  });
});
