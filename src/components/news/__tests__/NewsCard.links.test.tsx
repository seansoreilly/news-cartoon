import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NewsCard } from '../NewsCard';
import type { NewsArticle } from '../../../types';

const make = (url: string) =>
  ({ id: '1', title: 'A headline', url, source: { name: 'Example' }, publishedAt: new Date().toISOString() }) as unknown as NewsArticle;

describe('NewsCard article link', () => {
  it('renders http(s) links', () => {
    render(<NewsCard article={make('https://example.com/a')} selected={false} onSelect={() => {}} />);
    expect(screen.getByRole('link', { name: /read article/i }).getAttribute('href')).toBe('https://example.com/a');
  });

  it('never renders a javascript: URL as an href', () => {
    render(<NewsCard article={make('javascript:alert(1)')} selected={false} onSelect={() => {}} />);
    expect(screen.getByText(/read article/i).closest('a')?.getAttribute('href')).toBeNull();
  });
});
