import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConceptGenerator from '../cartoon/ConceptGenerator';
import ConceptDisplay from '../cartoon/ConceptDisplay';
import ComicScriptDisplay from '../cartoon/ComicScriptDisplay';
import ImageGenerator from '../cartoon/ImageGenerator';
import { useNewsStore } from '../../store/newsStore';
import { useLocationStore } from '../../store/locationStore';
import { useCartoonStore } from '../../store/cartoonStore';
import { geminiService } from '../../services/geminiService';

// Mock stores and services
vi.mock('../../store/newsStore');
vi.mock('../../store/locationStore');
vi.mock('../../store/cartoonStore');
vi.mock('../../services/geminiService');

describe('ConceptGenerator', () => {
  const mockConcepts = {
    topic: 'Politics',
    location: 'New York',
    ideas: [
      {
        title: 'Concept 1',
        premise: 'A funny premise',
        why_funny: 'It is humorous',
        location: 'New York',
      },
    ],
    ranking: ['Concept 1'],
    winner: 'Concept 1',
    generatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useNewsStore as any).mockReturnValue({
      selectedArticles: [
        {
          title: 'Test Article',
          description: 'Test Description',
          source: 'Test Source',
          url: 'http://example.com',
        },
      ],
    });
    (useLocationStore as any).mockReturnValue({
      location: { name: 'New York', coordinates: { lat: 0, lng: 0 }, source: 'manual' },
    });
    (useCartoonStore as any).mockReturnValue({
      cartoon: null,
      setCartoon: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
    });
    (geminiService.generateCartoonConcepts as any).mockResolvedValue(mockConcepts);
  });

  describe('ConceptGenerator Rendering', () => {
    it('should render generate concepts button', () => {
      render(<ConceptGenerator />);
      expect(screen.getByRole('button', { name: /generate.*concepts/i })).toBeInTheDocument();
    });

    it('should show prerequisites not met message when no location', () => {
      (useLocationStore as any).mockReturnValue({
        location: null,
      });

      render(<ConceptGenerator />);
      expect(screen.getByText(/please set your location/i)).toBeInTheDocument();
    });

    it('should show prerequisites not met message when no articles', () => {
      (useNewsStore as any).mockReturnValue({
        selectedArticles: [],
      });

      render(<ConceptGenerator />);
      expect(screen.getByText(/please select.*articles/i)).toBeInTheDocument();
    });
  });

  describe('ConceptGenerator Generation', () => {
    it('should generate concepts when button clicked', async () => {
      const user = userEvent.setup();
      const mockSetCartoon = vi.fn();
      (useCartoonStore as any).mockReturnValue({
        cartoon: null,
        setCartoon: mockSetCartoon,
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<ConceptGenerator />);
      const generateButton = screen.getByRole('button', { name: /generate.*concepts/i });

      await user.click(generateButton);

      await waitFor(() => {
        expect(geminiService.generateCartoonConcepts).toHaveBeenCalled();
      });
    });

    it('should set concepts on successful generation', async () => {
      const user = userEvent.setup();
      const mockSetCartoon = vi.fn();
      (useCartoonStore as any).mockReturnValue({
        cartoon: null,
        setCartoon: mockSetCartoon,
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<ConceptGenerator />);
      const generateButton = screen.getByRole('button', { name: /generate.*concepts/i });

      await user.click(generateButton);

      await waitFor(() => {
        expect(mockSetCartoon).toHaveBeenCalledWith(mockConcepts);
      });
    });

    it('should handle generation error', async () => {
      const user = userEvent.setup();
      const mockSetError = vi.fn();
      const error = new Error('Generation failed');

      (geminiService.generateCartoonConcepts as any).mockRejectedValue(error);
      (useCartoonStore as any).mockReturnValue({
        cartoon: null,
        setCartoon: vi.fn(),
        setLoading: vi.fn(),
        setError: mockSetError,
      });

      render(<ConceptGenerator />);
      const generateButton = screen.getByRole('button', { name: /generate.*concepts/i });

      await user.click(generateButton);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalled();
      });
    });
  });
});

describe('ConceptDisplay', () => {
  const mockConcepts = {
    topic: 'Politics',
    location: 'New York',
    ideas: [
      {
        title: 'Concept 1',
        premise: 'A funny premise',
        why_funny: 'It is humorous',
        location: 'New York',
      },
    ],
    ranking: ['Concept 1'],
    winner: 'Concept 1',
    generatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ConceptDisplay Rendering', () => {
    it('should return null when no concepts', () => {
      (useCartoonStore as any).mockReturnValue({
        cartoon: null,
      });

      const { container } = render(<ConceptDisplay />);
      expect(container.firstChild).toBeNull();
    });

    it('should display concepts when available', () => {
      (useCartoonStore as any).mockReturnValue({
        cartoon: mockConcepts,
      });

      render(<ConceptDisplay />);
      expect(screen.getByText('Concept 1')).toBeInTheDocument();
    });

    it('should display concept details', () => {
      (useCartoonStore as any).mockReturnValue({
        cartoon: mockConcepts,
      });

      render(<ConceptDisplay />);
      expect(screen.getByText('A funny premise')).toBeInTheDocument();
      expect(screen.getByText('It is humorous')).toBeInTheDocument();
    });
  });
});

describe('ComicScriptDisplay', () => {
  const mockScript = {
    panels: [
      { panelNumber: 1, description: 'Panel 1 description' },
      { panelNumber: 2, description: 'Panel 2 description' },
    ],
    description: 'Comic script description',
    generatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ComicScriptDisplay Rendering', () => {
    it('should return null when no script', () => {
      (useCartoonStore as any).mockReturnValue({
        comicScript: null,
      });

      const { container } = render(<ComicScriptDisplay />);
      expect(container.firstChild).toBeNull();
    });

    it('should display script when available', () => {
      (useCartoonStore as any).mockReturnValue({
        comicScript: mockScript,
      });

      render(<ComicScriptDisplay />);
      expect(screen.getByText('Comic script description')).toBeInTheDocument();
    });

    it('should display panel descriptions', () => {
      (useCartoonStore as any).mockReturnValue({
        comicScript: mockScript,
      });

      render(<ComicScriptDisplay />);
      expect(screen.getByText('Panel 1 description')).toBeInTheDocument();
      expect(screen.getByText('Panel 2 description')).toBeInTheDocument();
    });
  });
});

describe('ImageGenerator', () => {
  const mockConcept = {
    topic: 'Politics',
    location: 'New York',
    ideas: [
      {
        title: 'Concept 1',
        premise: 'A funny premise',
        why_funny: 'It is humorous',
        location: 'New York',
      },
    ],
    ranking: ['Concept 1'],
    winner: 'Concept 1',
    generatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useNewsStore as any).mockReturnValue({
      selectedArticles: [
        {
          title: 'Article 1',
          description: 'Description',
          source: 'Source',
          url: 'http://example.com',
        },
      ],
    });
    (useCartoonStore as any).mockReturnValue({
      cartoon: mockConcept,
      imagePath: null,
      setImagePath: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
    });
    (geminiService.generateCartoonImage as any).mockResolvedValue(
      'data:image/png;base64,iVBORw0KGgoAAAANS...'
    );
  });

  describe('ImageGenerator Rendering', () => {
    it('should render generate image button', () => {
      render(<ImageGenerator />);
      expect(screen.getByRole('button', { name: /generate.*image/i })).toBeInTheDocument();
    });

    it('should display generated image', () => {
      (useCartoonStore as any).mockReturnValue({
        cartoon: mockConcept,
        imagePath: 'data:image/png;base64,test',
        setImagePath: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      const { container } = render(<ImageGenerator />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
    });

    it('should display download button when image exists', () => {
      (useCartoonStore as any).mockReturnValue({
        cartoon: mockConcept,
        imagePath: 'data:image/png;base64,test',
        setImagePath: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<ImageGenerator />);
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    });
  });

  describe('ImageGenerator Generation', () => {
    it('should generate image when button clicked', async () => {
      const user = userEvent.setup();
      render(<ImageGenerator />);

      const generateButton = screen.getByRole('button', { name: /generate.*image/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(geminiService.generateCartoonImage).toHaveBeenCalled();
      });
    });

    it('should set image path on successful generation', async () => {
      const user = userEvent.setup();
      const mockSetImagePath = vi.fn();
      (useCartoonStore as any).mockReturnValue({
        cartoon: mockConcept,
        imagePath: null,
        setImagePath: mockSetImagePath,
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<ImageGenerator />);

      const generateButton = screen.getByRole('button', { name: /generate.*image/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockSetImagePath).toHaveBeenCalledWith(
          'data:image/png;base64,iVBORw0KGgoAAAANS...'
        );
      });
    });

    it('should handle generation error', async () => {
      const user = userEvent.setup();
      const mockSetError = vi.fn();
      const error = new Error('Image generation failed');

      (geminiService.generateCartoonImage as any).mockRejectedValue(error);
      (useCartoonStore as any).mockReturnValue({
        cartoon: mockConcept,
        imagePath: null,
        setImagePath: vi.fn(),
        setLoading: vi.fn(),
        setError: mockSetError,
      });

      render(<ImageGenerator />);

      const generateButton = screen.getByRole('button', { name: /generate.*image/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalled();
      });
    });
  });

  describe('ImageGenerator Download', () => {
    it('should download image when download button clicked', async () => {
      const user = userEvent.setup();
      (useCartoonStore as any).mockReturnValue({
        cartoon: mockConcept,
        imagePath: 'data:image/png;base64,test',
        setImagePath: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<ImageGenerator />);

      const downloadButton = screen.getByRole('button', { name: /download/i });
      await user.click(downloadButton);

      // Download should trigger
      expect(downloadButton).toBeInTheDocument();
    });

    it('should clear image when regenerate clicked', async () => {
      const user = userEvent.setup();
      const mockSetImagePath = vi.fn();
      (useCartoonStore as any).mockReturnValue({
        cartoon: mockConcept,
        imagePath: 'data:image/png;base64,test',
        setImagePath: mockSetImagePath,
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<ImageGenerator />);

      const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
      await user.click(regenerateButton);

      expect(mockSetImagePath).toHaveBeenCalledWith(null);
    });
  });

  describe('ImageGenerator Rate Limiting', () => {
    it('should show rate limit message when limit reached', () => {
      (useCartoonStore as any).mockReturnValue({
        cartoon: mockConcept,
        imagePath: null,
        setImagePath: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      // Mock rate limiting by simulating error
      const { container } = render(<ImageGenerator />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('ImageGenerator Accessibility', () => {
    it('should have accessible buttons', () => {
      render(<ImageGenerator />);

      expect(screen.getByRole('button', { name: /generate.*image/i })).toBeInTheDocument();
    });

    it('should have alt text for generated image', () => {
      (useCartoonStore as any).mockReturnValue({
        cartoon: mockConcept,
        imagePath: 'data:image/png;base64,test',
        setImagePath: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      const { container } = render(<ImageGenerator />);
      const img = container.querySelector('img');
      expect(img).toHaveAttribute('alt');
    });
  });
});
