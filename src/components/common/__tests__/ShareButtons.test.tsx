import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ShareButtons from '../ShareButtons';

describe('ShareButtons', () => {
  const mockUrl = 'https://example.com';
  const mockTitle = 'Test Title';
  const mockDescription = 'Test Description';

  it('renders all share buttons', () => {
    render(<ShareButtons url={mockUrl} title={mockTitle} description={mockDescription} />);
    
    expect(screen.getByLabelText('Share on X (Twitter)')).toBeInTheDocument();
    expect(screen.getByLabelText('Share on Facebook')).toBeInTheDocument();
    expect(screen.getByLabelText('Share on LinkedIn')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy Link')).toBeInTheDocument();
  });

  it('generates correct share links', () => {
    render(<ShareButtons url={mockUrl} title={mockTitle} description={mockDescription} />);
    
    const twitterLink = screen.getByLabelText('Share on X (Twitter)').closest('a');
    expect(twitterLink).toHaveAttribute('href', expect.stringContaining('twitter.com/intent/tweet'));
    expect(twitterLink).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(mockUrl)));
    
    const facebookLink = screen.getByLabelText('Share on Facebook').closest('a');
    expect(facebookLink).toHaveAttribute('href', expect.stringContaining('facebook.com/sharer/sharer.php'));
    
    const linkedinLink = screen.getByLabelText('Share on LinkedIn').closest('a');
    expect(linkedinLink).toHaveAttribute('href', expect.stringContaining('linkedin.com/shareArticle'));
  });

  it('copies link to clipboard when Copy Link is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ShareButtons url={mockUrl} title={mockTitle} />);
    
    const copyButton = screen.getByLabelText('Copy Link');
    fireEvent.click(copyButton);
    
    expect(writeTextMock).toHaveBeenCalledWith(mockUrl);
  });
});
