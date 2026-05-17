import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../common/LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render loading spinner component', () => {
      const { container } = render(<LoadingSpinner />);
      expect(container).toBeInTheDocument();
    });

    it('should display "Loading" label', () => {
      render(<LoadingSpinner />);
      // Two occurrences: sr-only label inside the HalftoneSpinner and the visible caption
      const matches = screen.getAllByText('Loading');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('should render the halftone spinner svg', () => {
      const { container } = render(<LoadingSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('animate-spin');
    });

    it('should render 8 halftone dots', () => {
      const { container } = render(<LoadingSpinner />);
      const dots = container.querySelectorAll('svg circle');
      expect(dots.length).toBe(8);
    });
  });

  describe('Structure', () => {
    it('should be a flex column container with center alignment', () => {
      const { container } = render(<LoadingSpinner />);
      const flexContainer = container.firstChild;
      expect(flexContainer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    it('should render a status role for screen readers', () => {
      render(<LoadingSpinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should size the spinner at w-16 h-16', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveClass('w-16', 'h-16');
    });
  });

  describe('Styling', () => {
    it('should apply vertical padding', () => {
      const { container } = render(<LoadingSpinner />);
      const outerDiv = container.firstChild;
      expect(outerDiv).toHaveClass('py-12');
    });

    it('should tint the spinner in purple via currentColor', () => {
      const { container } = render(<LoadingSpinner />);
      const tinted = container.querySelector('.text-purple-600');
      expect(tinted).toBeInTheDocument();
    });

    it('should fill all dots with currentColor', () => {
      const { container } = render(<LoadingSpinner />);
      const dots = container.querySelectorAll('svg circle');
      dots.forEach((dot) => {
        expect(dot.getAttribute('fill')).toBe('currentColor');
      });
    });

    it('should give dots varying opacity to create a trail', () => {
      const { container } = render(<LoadingSpinner />);
      const dots = Array.from(container.querySelectorAll('svg circle'));
      const opacities = dots.map((d) => Number(d.getAttribute('opacity')));
      // Brightest dot first, faintest last
      expect(opacities[0]).toBeGreaterThan(opacities[opacities.length - 1]);
      // Unique opacities, not all identical
      const unique = new Set(opacities);
      expect(unique.size).toBeGreaterThan(1);
    });
  });

  describe('Animation', () => {
    it('should have spin animation class on the svg', () => {
      const { container } = render(<LoadingSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });
  });

  describe('Accessibility', () => {
    it('should expose a status role for screen readers', () => {
      render(<LoadingSpinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have an aria-label of "Loading"', () => {
      render(<LoadingSpinner />);
      expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    });
  });

  describe('Consistency', () => {
    it('should render consistently across multiple mounts', () => {
      const { container: c1 } = render(<LoadingSpinner />);
      const { container: c2 } = render(<LoadingSpinner />);
      const svg1 = c1.querySelector('svg');
      const svg2 = c2.querySelector('svg');
      expect(svg1?.outerHTML).toBe(svg2?.outerHTML);
    });
  });
});
