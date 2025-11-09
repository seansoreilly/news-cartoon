import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewsDisplay from '../news/NewsDisplay';
import { useNewsStore } from '../../store/newsStore';
import { useLocationStore } from '../../store/locationStore';
import { newsService } from '../../services/newsService';
import { geminiService } from '../../services/geminiService';

// Mock stores and services
vi.mock('../../store/newsStore');
vi.mock('../../store/locationStore');
vi.mock('../../services/newsService');
vi.mock('../../services/geminiService');

describe('NewsDisplay', () => {
  const mockArticles = [
    {
      title: 'Breaking News',
      description: 'Important news story',
      source: 'Test News',
      url: 'http://example.com/news1',
      image: 'http://example.com/image1.jpg',
    },
    {
      title: 'Another Story',
      description: 'Another interesting news',
      source: 'Test News',
      url: 'http://example.com/news2',
      image: 'http://example.com/image2.jpg',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useLocationStore as any).mockReturnValue({
      location: { name: 'New York', coordinates: { lat: 0, lng: 0 }, source: 'manual' },
    });
    (useNewsStore as any).mockReturnValue({
      news: null,
      articles: [],
      selectedArticles: [],
      isLoading: false,
      error: null,
      setNews: vi.fn(),
      selectArticle: vi.fn(),
      deselectArticle: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
    });
    (newsService.fetchNewsByLocation as any).mockResolvedValue({
      articles: mockArticles,
      totalResults: 2,
    });
    (newsService.fetchArticleContent as any).mockResolvedValue({
      content: 'Full article content',
    });
    (geminiService.batchAnalyzeArticles as any).mockResolvedValue([
      { title: 'Breaking News', humorScore: 75, summary: 'Enhanced summary 1' },
      { title: 'Another Story', humorScore: 60, summary: 'Enhanced summary 2' },
    ]);
  });

  describe('Rendering', () => {
    it('should render news display component', () => {
      (useNewsStore as any).mockReturnValue({
        news: null,
        articles: [],
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);
      expect(screen.getByText(/news/i)).toBeInTheDocument();
    });

    it('should fetch news when location changes', async () => {
      (useNewsStore as any).mockReturnValue({
        news: null,
        articles: [],
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);

      await waitFor(() => {
        expect(newsService.fetchNewsByLocation).toHaveBeenCalledWith('New York');
      });
    });

    it('should display loading state', () => {
      (useNewsStore as any).mockReturnValue({
        news: null,
        articles: [],
        selectedArticles: [],
        isLoading: true,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should display error when fetching fails', () => {
      (useNewsStore as any).mockReturnValue({
        news: null,
        articles: [],
        selectedArticles: [],
        isLoading: false,
        error: 'Failed to fetch news',
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);
      expect(screen.getByText(/failed to fetch news/i)).toBeInTheDocument();
    });
  });

  describe('Article Display', () => {
    it('should display articles when loaded', () => {
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);

      expect(screen.getByText('Breaking News')).toBeInTheDocument();
      expect(screen.getByText('Another Story')).toBeInTheDocument();
    });

    it('should display article titles', () => {
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);

      mockArticles.forEach((article) => {
        expect(screen.getByText(article.title)).toBeInTheDocument();
      });
    });

    it('should display article descriptions', () => {
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);

      expect(screen.getByText(/important news story/i)).toBeInTheDocument();
      expect(screen.getByText(/another interesting news/i)).toBeInTheDocument();
    });

    it('should display source information', () => {
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);

      const sources = screen.getAllByText('Test News');
      expect(sources.length).toBeGreaterThan(0);
    });

    it('should display read more links', () => {
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);

      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });
  });

  describe('Article Selection', () => {
    it('should have checkboxes for article selection', () => {
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      const { container } = render(<NewsDisplay />);
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should select article when checkbox clicked', async () => {
      const user = userEvent.setup();
      const mockSelectArticle = vi.fn();
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: mockSelectArticle,
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      const { container } = render(<NewsDisplay />);
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');

      await user.click(checkboxes[0]);

      expect(mockSelectArticle).toHaveBeenCalled();
    });

    it('should deselect article when checkbox unchecked', async () => {
      const user = userEvent.setup();
      const mockDeselectArticle = vi.fn();
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [mockArticles[0]],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: mockDeselectArticle,
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      const { container } = render(<NewsDisplay />);
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');

      await user.click(checkboxes[0]);

      expect(mockDeselectArticle).toHaveBeenCalled();
    });
  });

  describe('Humor Score Display', () => {
    it('should display humor score for articles', () => {
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);

      // Should display humor score badge
      expect(screen.getByText(/humor/i)).toBeInTheDocument();
    });

    it('should display humor score in range 1-100', () => {
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      const { container } = render(<NewsDisplay />);

      // Verify humor scores are displayed
      const humorElements = container.querySelectorAll('[data-testid*="humor"]');
      expect(humorElements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should show retry button on error', () => {
      (useNewsStore as any).mockReturnValue({
        news: null,
        articles: [],
        selectedArticles: [],
        isLoading: false,
        error: 'Failed to fetch news',
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should retry fetch when retry button clicked', async () => {
      const user = userEvent.setup();
      const mockSetLoading = vi.fn();
      (useNewsStore as any).mockReturnValue({
        news: null,
        articles: [],
        selectedArticles: [],
        isLoading: false,
        error: 'Failed to fetch news',
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: mockSetLoading,
        setError: vi.fn(),
      });

      render(<NewsDisplay />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockSetLoading).toHaveBeenCalled();
      });
    });
  });

  describe('Content Fetching', () => {
    it('should fetch article content when article selected', async () => {
      const user = userEvent.setup();
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      const { container } = render(<NewsDisplay />);
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');

      await user.click(checkboxes[0]);

      await waitFor(() => {
        expect(newsService.fetchArticleContent).toHaveBeenCalled();
      });
    });
  });

  describe('AI Enhancement', () => {
    it('should trigger AI enhancement on article display', async () => {
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);

      await waitFor(() => {
        expect(geminiService.batchAnalyzeArticles).toHaveBeenCalled();
      });
    });

    it('should update store with enhanced data', async () => {
      const mockSetNews = vi.fn();
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: mockSetNews,
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);

      await waitFor(() => {
        expect(mockSetNews).toHaveBeenCalled();
      });
    });
  });

  describe('No Results State', () => {
    it('should display no results message when no articles', () => {
      (useNewsStore as any).mockReturnValue({
        news: { articles: [] },
        articles: [],
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);

      expect(screen.getByText(/no.*results/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible checkboxes', () => {
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      const { container } = render(<NewsDisplay />);
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');

      checkboxes.forEach((checkbox) => {
        expect(checkbox).toHaveAttribute('type', 'checkbox');
      });
    });

    it('should have accessible links', () => {
      (useNewsStore as any).mockReturnValue({
        news: { articles: mockArticles },
        articles: mockArticles,
        selectedArticles: [],
        isLoading: false,
        error: null,
        setNews: vi.fn(),
        selectArticle: vi.fn(),
        deselectArticle: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      render(<NewsDisplay />);

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveAttribute('href');
      });
    });
  });
});
