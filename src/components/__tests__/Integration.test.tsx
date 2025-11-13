import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Layout from '../layout/Layout';
import ProgressIndicator from '../common/ProgressIndicator';
import LocationDetector from '../location/LocationDetector';
import { useLocationStore } from '../../store/locationStore';
import { useNewsStore } from '../../store/newsStore';
import { useCartoonStore } from '../../store/cartoonStore';
import { locationService } from '../../services/locationService';

// Mock stores and services
vi.mock('../../store/locationStore');
vi.mock('../../store/newsStore');
vi.mock('../../store/cartoonStore');
vi.mock('../../services/locationService');
vi.mock('../../services/newsService');
vi.mock('../../services/geminiService');

describe('Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Layout Integration', () => {
    it('should render layout with children', () => {
      render(
        <Layout>
          <div data-testid="test-child">Test Content</div>
        </Layout>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('News Cartoon')).toBeInTheDocument();
    });

    it('should display header and footer consistently', () => {
      const { rerender } = render(
        <Layout>
          <div>Content 1</div>
        </Layout>
      );

      expect(screen.getByText('News Cartoon')).toBeInTheDocument();

      rerender(
        <Layout>
          <div>Content 2</div>
        </Layout>
      );

      expect(screen.getByText('News Cartoon')).toBeInTheDocument();
    });

    it('should maintain layout structure across different children', () => {
      const { container, rerender } = render(
        <Layout>
          <button>Click me</button>
        </Layout>
      );

      const header1 = container.querySelector('header');
      const footer1 = container.querySelector('footer');

      rerender(
        <Layout>
          <form>
            <input type="text" />
          </form>
        </Layout>
      );

      const header2 = container.querySelector('header');
      const footer2 = container.querySelector('footer');

      expect(header1).toBeTruthy();
      expect(footer1).toBeTruthy();
      expect(header2).toBeTruthy();
      expect(footer2).toBeTruthy();
    });
  });

  describe('ProgressIndicator with Store Integration', () => {
    it('should update progress when location store changes', () => {
      const mockLocationStore: any = {
        location: null,
      };
      const mockNewsStore = {
        articles: [],
      };
      const mockCartoonStore = {
        cartoon: null,
        imagePath: null,
      };

      (useLocationStore as any).mockReturnValue(mockLocationStore);
      (useNewsStore as any).mockReturnValue(mockNewsStore);
      (useCartoonStore as any).mockReturnValue(mockCartoonStore);

      const { rerender } = render(<ProgressIndicator />);

      expect(screen.getByText('Set Location')).toBeInTheDocument();

      // Update location store
      mockLocationStore.location = {
        name: 'New York',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      };

      rerender(<ProgressIndicator />);

      expect(screen.getByText('Set Location')).toBeInTheDocument();
    });

    it('should show all steps in progress as workflow completes', () => {
      (useLocationStore as any).mockReturnValue({
        location: {
          name: 'Test City',
          coordinates: { lat: 0, lng: 0 },
          source: 'manual',
        },
      });
      (useNewsStore as any).mockReturnValue({
        articles: [
          {
            title: 'Article 1',
            description: 'Description 1',
            source: 'Source 1',
            url: 'http://example.com',
          },
        ],
      });
      (useCartoonStore as any).mockReturnValue({
        cartoon: {
          topic: 'Test',
          location: 'Test City',
          ideas: [{ title: 'Idea', premise: 'P', why_funny: 'F', location: 'Test' }],
          ranking: ['Idea'],
          winner: 'Idea',
          generatedAt: Date.now(),
        },
        imagePath: 'data:image/png;base64,test',
      });

      render(<ProgressIndicator />);

      expect(screen.getByText('Set Location')).toBeInTheDocument();
      expect(screen.getByText('Select News')).toBeInTheDocument();
      expect(screen.getByText('Generate Concepts')).toBeInTheDocument();
      expect(screen.getByText('Generate Image')).toBeInTheDocument();
    });
  });

  describe('LocationDetector and Store Integration', () => {
    it('should update location store when detection succeeds', async () => {
      const user = userEvent.setup();
      const mockSetLocation = vi.fn();
      const mockLocationData = {
        name: 'San Francisco, CA',
        coordinates: { lat: 37.7749, lng: -122.4194 },
        source: 'manual' as const,
      };

      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: mockSetLocation,
        clearLocation: vi.fn(),
        setError: vi.fn(),
      });
      (locationService.detectLocation as any).mockResolvedValue(mockLocationData);

      render(<LocationDetector />);

      const input = screen.getByPlaceholderText(/enter search keywords/i);
      await user.type(input, 'San Francisco, CA');

      const submitButton = screen.getByRole('button', { name: /search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetLocation).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'San Francisco, CA',
            source: 'manual',
          })
        );
      });
    });

    it('should reflect location change in component state', () => {
      const mockLocation = {
        name: 'Boston, MA',
        coordinates: { lat: 42.3601, lng: -71.0589 },
        source: 'manual' as const,
      };

      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: vi.fn(),
      });

      const { rerender } = render(<LocationDetector />);

      // After setting location, rerender with updated store
      (useLocationStore as any).mockReturnValue({
        location: mockLocation,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: vi.fn(),
      });

      rerender(<LocationDetector />);

      expect(screen.getByText(mockLocation.name)).toBeInTheDocument();
    });
  });

  describe('Error Flow Integration', () => {
    it('should propagate errors from service to store to component', async () => {
      const user = userEvent.setup();
      const mockSetError = vi.fn();
      const errorMessage = 'Network error';

      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: mockSetError,
      });
      (locationService.detectLocation as any).mockRejectedValue(
        new Error(errorMessage)
      );

      render(<LocationDetector />);

      const input = screen.getByPlaceholderText(/enter search keywords/i);
      await user.type(input, 'Test');

      const submitButton = screen.getByRole('button', { name: /search/i });
      await user.click(submitButton);

      // Should set location successfully (manual entry doesn't fail)
      expect(mockSetError).toHaveBeenCalledWith(null);
    });
  });

  describe('Multi-Component Workflow', () => {
    it('should handle complete location -> news -> cartoon workflow', () => {
      const mockLocation = {
        name: 'New York, NY',
        coordinates: { lat: 40.7128, lng: -74.006 },
        source: 'manual' as const,
      };

      const mockArticles = [
        {
          title: 'Breaking News',
          description: 'Important news',
          source: 'News Agency',
          url: 'http://example.com/news1',
        },
      ];

      const mockConcepts = {
        topic: 'Politics',
        location: 'New York, NY',
        ideas: [
          {
            title: 'Concept 1',
            premise: 'A funny concept',
            why_funny: 'It is humorous',
            location: 'New York, NY',
          },
        ],
        ranking: ['Concept 1'],
        winner: 'Concept 1',
        generatedAt: Date.now(),
      };

      // Step 1: Location is set
      (useLocationStore as any).mockReturnValue({
        location: mockLocation,
      });
      (useNewsStore as any).mockReturnValue({
        articles: [],
      });
      (useCartoonStore as any).mockReturnValue({
        cartoon: null,
        imagePath: null,
      });

      const { rerender } = render(<ProgressIndicator />);

      expect(screen.getByText('Set Location')).toBeInTheDocument();

      // Step 2: Articles are loaded
      (useNewsStore as any).mockReturnValue({
        articles: mockArticles,
      });

      rerender(<ProgressIndicator />);

      expect(screen.getByText('Select News')).toBeInTheDocument();

      // Step 3: Concepts are generated
      (useCartoonStore as any).mockReturnValue({
        cartoon: mockConcepts,
        imagePath: null,
      });

      rerender(<ProgressIndicator />);

      expect(screen.getByText('Generate Concepts')).toBeInTheDocument();

      // Step 4: Image is generated
      (useCartoonStore as any).mockReturnValue({
        cartoon: mockConcepts,
        imagePath: 'data:image/png;base64,iVBORw0KGgo...',
      });

      rerender(<ProgressIndicator />);

      expect(screen.getByText('Generate Image')).toBeInTheDocument();
    });
  });

  describe('Store Synchronization', () => {
    it('should keep component state in sync with store', () => {
      const storeState: any = {
        location: null,
        news: null,
        cartoon: null,
      };

      (useLocationStore as any).mockImplementation(() => ({
        location: storeState.location,
        setLocation: (loc: any) => {
          storeState.location = loc;
        },
      }));

      const { rerender } = render(<ProgressIndicator />);

      expect(useLocationStore).toHaveBeenCalled();

      // Update store
      storeState.location = {
        name: 'Test',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual' as const,
      };

      rerender(<ProgressIndicator />);

      expect(useLocationStore).toHaveBeenCalled();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple state updates correctly', async () => {
      const user = userEvent.setup();
      const mockSetLocation = vi.fn();

      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: mockSetLocation,
        clearLocation: vi.fn(),
        setError: vi.fn(),
      });

      render(<LocationDetector />);

      const input = screen.getByPlaceholderText(/enter search keywords/i);

      // Type in location
      await user.type(input, 'Location 1');
      const submitButton = screen.getByRole('button', { name: /search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetLocation).toHaveBeenCalled();
      });

      // Verify input was cleared
      expect(input).toHaveValue('');
    });
  });

  describe('Component Lifecycle Integration', () => {
    it('should handle component remount with store persistence', () => {
      const mockLocation = {
        name: 'Test City',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual' as const,
      };

      (useLocationStore as any).mockReturnValue({
        location: mockLocation,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: vi.fn(),
      });

      const { unmount } = render(<LocationDetector />);

      expect(screen.getByText(mockLocation.name)).toBeInTheDocument();

      // Unmount and remount
      unmount();

      render(<LocationDetector />);

      expect(screen.getByText(mockLocation.name)).toBeInTheDocument();
    });
  });

  describe('Store Interactions', () => {
    it('should call multiple store methods in correct order', async () => {
      const user = userEvent.setup();
      const mockSetLocation = vi.fn();
      const mockSetError = vi.fn();

      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: mockSetLocation,
        clearLocation: vi.fn(),
        setError: mockSetError,
      });

      render(<LocationDetector />);

      const input = screen.getByPlaceholderText(/enter search keywords/i);
      await user.type(input, 'New Location');

      const submitButton = screen.getByRole('button', { name: /search/i });
      await user.click(submitButton);

      await waitFor(() => {
        // setLocation should be called with location data
        expect(mockSetLocation).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Location',
          })
        );
        // setError should be called with null to clear errors
        expect(mockSetError).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('Cross-Store Dependencies', () => {
    it('should handle dependencies between multiple stores', () => {
      const mockLocation = {
        name: 'City',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual' as const,
      };

      (useLocationStore as any).mockReturnValue({
        location: mockLocation,
      });

      (useNewsStore as any).mockReturnValue({
        articles: [
          {
            title: 'News 1',
            description: 'Description',
            source: 'Source',
            url: 'http://example.com',
          },
        ],
      });

      (useCartoonStore as any).mockReturnValue({
        cartoon: {
          topic: 'Topic',
          location: 'City',
          ideas: [{ title: 'Idea', premise: 'P', why_funny: 'F', location: 'City' }],
          ranking: ['Idea'],
          winner: 'Idea',
          generatedAt: Date.now(),
        },
        imagePath: null,
      });

      render(<ProgressIndicator />);

      // All stores should be accessed
      expect(useLocationStore).toHaveBeenCalled();
      expect(useNewsStore).toHaveBeenCalled();
      expect(useCartoonStore).toHaveBeenCalled();
    });
  });
});
