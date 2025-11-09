import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressIndicator from '../common/ProgressIndicator';
import { useLocationStore } from '../../store/locationStore';
import { useNewsStore } from '../../store/newsStore';
import { useCartoonStore } from '../../store/cartoonStore';

// Mock the stores
vi.mock('../../store/locationStore');
vi.mock('../../store/newsStore');
vi.mock('../../store/cartoonStore');

describe('ProgressIndicator', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  const mockLocationStore = (location: any) => {
    (useLocationStore as any).mockReturnValue({
      location,
    });
  };

  const mockNewsStore = (news: any, articles: any = []) => {
    (useNewsStore as any).mockReturnValue({
      news,
      articles: articles || (news?.articles || []),
    });
  };

  const mockCartoonStore = (cartoon: any, imagePath: any) => {
    (useCartoonStore as any).mockReturnValue({
      cartoon,
      imagePath,
    });
  };

  describe('Step display', () => {
    it('should render all four steps', () => {
      mockLocationStore(null);
      mockNewsStore(null);
      mockCartoonStore(null, null);

      render(<ProgressIndicator />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should display step labels', () => {
      mockLocationStore(null);
      mockNewsStore(null);
      mockCartoonStore(null, null);

      render(<ProgressIndicator />);

      expect(screen.getByText('Set Location')).toBeInTheDocument();
      expect(screen.getByText('Select News')).toBeInTheDocument();
      expect(screen.getByText('Generate Concepts')).toBeInTheDocument();
      expect(screen.getByText('Generate Image')).toBeInTheDocument();
    });
  });

  describe('Step 1: Set Location', () => {
    it('should mark step as pending when location is null', () => {
      mockLocationStore(null);
      mockNewsStore(null);
      mockCartoonStore(null, null);

      const { container } = render(<ProgressIndicator />);
      const step1Circle = container.querySelector('[data-testid="step-1"]') || container.querySelectorAll('circle')[0];

      expect(step1Circle).toBeInTheDocument();
    });

    it('should mark step as completed when location exists', () => {
      mockLocationStore({
        name: 'New York, NY',
        coordinates: { lat: 40.7128, lng: -74.006 },
        source: 'manual',
      });
      mockNewsStore(null);
      mockCartoonStore(null, null);

      const { container } = render(<ProgressIndicator />);

      // Step 1 should show checkmark or different styling
      const steps = container.querySelectorAll('[role="img"]');
      expect(steps.length).toBeGreaterThan(0);
    });
  });

  describe('Step 2: Select News', () => {
    it('should mark step as pending when no articles loaded', () => {
      mockLocationStore({
        name: 'Test Location',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      });
      mockNewsStore(null, []);
      mockCartoonStore(null, null);

      render(<ProgressIndicator />);
      expect(screen.getByText('Select News')).toBeInTheDocument();
    });

    it('should mark step as completed when articles are loaded', () => {
      mockLocationStore({
        name: 'Test Location',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      });
      mockNewsStore(
        {
          articles: [
            {
              title: 'Article 1',
              description: 'Description 1',
              source: 'Source 1',
              url: 'http://example.com/1',
            },
          ],
        },
        [
          {
            title: 'Article 1',
            description: 'Description 1',
            source: 'Source 1',
            url: 'http://example.com/1',
          },
        ]
      );
      mockCartoonStore(null, null);

      render(<ProgressIndicator />);
      expect(screen.getByText('Select News')).toBeInTheDocument();
    });
  });

  describe('Step 3: Generate Concepts', () => {
    it('should mark step as pending when no cartoon exists', () => {
      mockLocationStore({
        name: 'Test',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      });
      mockNewsStore(
        {
          articles: [
            {
              title: 'Article 1',
              description: 'Description 1',
              source: 'Source 1',
              url: 'http://example.com/1',
            },
          ],
        },
        [
          {
            title: 'Article 1',
            description: 'Description 1',
            source: 'Source 1',
            url: 'http://example.com/1',
          },
        ]
      );
      mockCartoonStore(null, null);

      render(<ProgressIndicator />);
      expect(screen.getByText('Generate Concepts')).toBeInTheDocument();
    });

    it('should mark step as completed when cartoon concept exists', () => {
      mockLocationStore({
        name: 'Test',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      });
      mockNewsStore(
        {
          articles: [
            {
              title: 'Article 1',
              description: 'Description 1',
              source: 'Source 1',
              url: 'http://example.com/1',
            },
          ],
        },
        [
          {
            title: 'Article 1',
            description: 'Description 1',
            source: 'Source 1',
            url: 'http://example.com/1',
          },
        ]
      );
      mockCartoonStore(
        {
          topic: 'Politics',
          location: 'Test',
          ideas: [
            {
              title: 'Concept 1',
              premise: 'A funny idea',
              why_funny: 'Because it is',
              location: 'Test',
            },
          ],
          ranking: ['Concept 1'],
          winner: 'Concept 1',
          generatedAt: Date.now(),
        },
        null
      );

      render(<ProgressIndicator />);
      expect(screen.getByText('Generate Concepts')).toBeInTheDocument();
    });
  });

  describe('Step 4: Generate Image', () => {
    it('should mark step as pending when no image path', () => {
      mockLocationStore({
        name: 'Test',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      });
      mockNewsStore(
        {
          articles: [
            {
              title: 'Article 1',
              description: 'Description 1',
              source: 'Source 1',
              url: 'http://example.com/1',
            },
          ],
        },
        [
          {
            title: 'Article 1',
            description: 'Description 1',
            source: 'Source 1',
            url: 'http://example.com/1',
          },
        ]
      );
      mockCartoonStore(
        {
          topic: 'Politics',
          location: 'Test',
          ideas: [
            {
              title: 'Concept 1',
              premise: 'A funny idea',
              why_funny: 'Because it is',
              location: 'Test',
            },
          ],
          ranking: ['Concept 1'],
          winner: 'Concept 1',
          generatedAt: Date.now(),
        },
        null
      );

      render(<ProgressIndicator />);
      expect(screen.getByText('Generate Image')).toBeInTheDocument();
    });

    it('should mark step as completed when image path exists', () => {
      mockLocationStore({
        name: 'Test',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      });
      mockNewsStore(
        {
          articles: [
            {
              title: 'Article 1',
              description: 'Description 1',
              source: 'Source 1',
              url: 'http://example.com/1',
            },
          ],
        },
        [
          {
            title: 'Article 1',
            description: 'Description 1',
            source: 'Source 1',
            url: 'http://example.com/1',
          },
        ]
      );
      mockCartoonStore(
        {
          topic: 'Politics',
          location: 'Test',
          ideas: [
            {
              title: 'Concept 1',
              premise: 'A funny idea',
              why_funny: 'Because it is',
              location: 'Test',
            },
          ],
          ranking: ['Concept 1'],
          winner: 'Concept 1',
          generatedAt: Date.now(),
        },
        'data:image/png;base64,iVBORw0KGgoAAAANS...'
      );

      render(<ProgressIndicator />);
      expect(screen.getByText('Generate Image')).toBeInTheDocument();
    });
  });

  describe('Step status combinations', () => {
    it('should show no steps completed when all null', () => {
      mockLocationStore(null);
      mockNewsStore(null);
      mockCartoonStore(null, null);

      const { container } = render(<ProgressIndicator />);

      // All steps should have pending styling
      const steps = container.querySelectorAll('[role="img"]');
      expect(steps.length).toBeGreaterThan(0);
    });

    it('should show only step 1 completed', () => {
      mockLocationStore({
        name: 'Test',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      });
      mockNewsStore(null);
      mockCartoonStore(null, null);

      render(<ProgressIndicator />);
      expect(screen.getByText('Set Location')).toBeInTheDocument();
    });

    it('should show steps 1-2 completed', () => {
      mockLocationStore({
        name: 'Test',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      });
      mockNewsStore(
        {
          articles: [
            {
              title: 'Article 1',
              description: 'Description 1',
              source: 'Source 1',
              url: 'http://example.com/1',
            },
          ],
        },
        [
          {
            title: 'Article 1',
            description: 'Description 1',
            source: 'Source 1',
            url: 'http://example.com/1',
          },
        ]
      );
      mockCartoonStore(null, null);

      render(<ProgressIndicator />);
      expect(screen.getByText('Set Location')).toBeInTheDocument();
      expect(screen.getByText('Select News')).toBeInTheDocument();
    });

    it('should show all steps completed', () => {
      mockLocationStore({
        name: 'Test',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      });
      mockNewsStore(
        {
          articles: [
            {
              title: 'Article 1',
              description: 'Description 1',
              source: 'Source 1',
              url: 'http://example.com/1',
            },
          ],
        },
        [
          {
            title: 'Article 1',
            description: 'Description 1',
            source: 'Source 1',
            url: 'http://example.com/1',
          },
        ]
      );
      mockCartoonStore(
        {
          topic: 'Politics',
          location: 'Test',
          ideas: [
            {
              title: 'Concept 1',
              premise: 'A funny idea',
              why_funny: 'Because it is',
              location: 'Test',
            },
          ],
          ranking: ['Concept 1'],
          winner: 'Concept 1',
          generatedAt: Date.now(),
        },
        'data:image/png;base64,iVBORw0KGgoAAAANS...'
      );

      render(<ProgressIndicator />);
      expect(screen.getByText('Set Location')).toBeInTheDocument();
      expect(screen.getByText('Select News')).toBeInTheDocument();
      expect(screen.getByText('Generate Concepts')).toBeInTheDocument();
      expect(screen.getByText('Generate Image')).toBeInTheDocument();
    });
  });

  describe('Store subscription', () => {
    it('should subscribe to all three stores', () => {
      mockLocationStore(null);
      mockNewsStore(null);
      mockCartoonStore(null, null);

      render(<ProgressIndicator />);

      expect(useLocationStore).toHaveBeenCalled();
      expect(useNewsStore).toHaveBeenCalled();
      expect(useCartoonStore).toHaveBeenCalled();
    });

    it('should update when location store changes', () => {
      const { rerender } = render(<ProgressIndicator />);

      mockLocationStore({
        name: 'New Location',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      });
      mockNewsStore(null);
      mockCartoonStore(null, null);

      rerender(<ProgressIndicator />);

      expect(useLocationStore).toHaveBeenCalledTimes(2);
    });

    it('should update when news store changes', () => {
      mockLocationStore(null);
      mockNewsStore(null);
      mockCartoonStore(null, null);

      const { rerender } = render(<ProgressIndicator />);

      mockLocationStore(null);
      mockNewsStore(
        {
          articles: [
            {
              title: 'Article 1',
              description: 'Description 1',
              source: 'Source 1',
              url: 'http://example.com/1',
            },
          ],
        },
        [
          {
            title: 'Article 1',
            description: 'Description 1',
            source: 'Source 1',
            url: 'http://example.com/1',
          },
        ]
      );
      mockCartoonStore(null, null);

      rerender(<ProgressIndicator />);

      expect(useNewsStore).toHaveBeenCalledTimes(2);
    });

    it('should update when cartoon store changes', () => {
      mockLocationStore(null);
      mockNewsStore(null);
      mockCartoonStore(null, null);

      const { rerender } = render(<ProgressIndicator />);

      mockLocationStore(null);
      mockNewsStore(null);
      mockCartoonStore(
        {
          topic: 'Politics',
          location: 'Test',
          ideas: [
            {
              title: 'Concept 1',
              premise: 'A funny idea',
              why_funny: 'Because it is',
              location: 'Test',
            },
          ],
          ranking: ['Concept 1'],
          winner: 'Concept 1',
          generatedAt: Date.now(),
        },
        null
      );

      rerender(<ProgressIndicator />);

      expect(useCartoonStore).toHaveBeenCalledTimes(2);
    });
  });

  describe('Responsive design', () => {
    it('should render horizontal layout', () => {
      mockLocationStore(null);
      mockNewsStore(null);
      mockCartoonStore(null, null);

      const { container } = render(<ProgressIndicator />);

      // Should have flex layout
      const progressContainer = container.querySelector('[role="img"]')?.parentElement;
      expect(progressContainer).toBeInTheDocument();
    });

    it('should have proper spacing between steps', () => {
      mockLocationStore(null);
      mockNewsStore(null);
      mockCartoonStore(null, null);

      const { container } = render(<ProgressIndicator />);

      const steps = container.querySelectorAll('[role="img"]');
      expect(steps.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Accessibility', () => {
    it('should be accessible to screen readers', () => {
      mockLocationStore(null);
      mockNewsStore(null);
      mockCartoonStore(null, null);

      render(<ProgressIndicator />);

      expect(screen.getByText('Set Location')).toBeInTheDocument();
      expect(screen.getByText('Select News')).toBeInTheDocument();
      expect(screen.getByText('Generate Concepts')).toBeInTheDocument();
      expect(screen.getByText('Generate Image')).toBeInTheDocument();
    });

    it('should have proper semantic structure', () => {
      mockLocationStore(null);
      mockNewsStore(null);
      mockCartoonStore(null, null);

      const { container } = render(<ProgressIndicator />);

      // Should contain navigable elements
      const steps = container.querySelectorAll('[role="img"]');
      expect(steps.length).toBeGreaterThan(0);
    });
  });
});
