import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import GalleryPage from '../GalleryPage';
import { fetchGalleryItems } from '../../services/galleryService';

vi.mock('../../services/galleryService');
vi.mock('../../components/common/ShareButtons', () => ({ default: () => null }));
vi.mock('../../components/common/MetaTags', () => ({ default: () => null }));

const item = (id: string, news_url?: string) => ({
  id,
  created_at: '2026-01-01T00:00:00Z',
  title: `Cartoon ${id}`,
  image_path: `${id}.png`,
  news_url,
  public_url: `https://example.supabase.co/${id}.png`,
});

describe('GalleryPage source links', () => {
  it('only renders a Source link for http(s) URLs', async () => {
    vi.mocked(fetchGalleryItems).mockResolvedValue({
      items: [item('a', 'https://news.example.com/story'), item('b', 'javascript:alert(1)'), item('c', 'data:text/html,hi'), item('d')],
    } as Awaited<ReturnType<typeof fetchGalleryItems>>);

    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Cartoon a')).toBeInTheDocument());
    const links = screen.getAllByRole('link', { name: 'Source' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://news.example.com/story');
  });
});
