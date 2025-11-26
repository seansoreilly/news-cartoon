import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingButton from './LoadingButton';

describe('LoadingButton', () => {
  it('renders children correctly in idle state', () => {
    render(
      <LoadingButton
        loadingText="Loading..."
        onClick={() => {}}
        isLoading={false}
      >
        Click Me
      </LoadingButton>
    );

    expect(screen.getByText('Click Me')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.queryByText('Done!')).not.toBeInTheDocument();
  });

  it('shows loading text and progress bar when loading', () => {
    render(
      <LoadingButton
        loadingText="Generating..."
        onClick={() => {}}
        isLoading={true}
      >
        Generate
      </LoadingButton>
    );

    // Check loading text
    expect(screen.getByText('Generating...')).toBeInTheDocument();
    expect(screen.queryByText('Generate')).not.toBeInTheDocument();

    // Check spinner
    const spinner = screen.getByRole('button').querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();

    // Check progress bar
    // The progress bar is a div with animate-progress-slide class
    const progressBar = screen.getByRole('button').querySelector('.animate-progress-slide');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveClass('bg-white');
    expect(progressBar?.parentElement).toHaveClass('bg-black/20');
  });

  it('transitions to success state after loading finishes', async () => {
    const { rerender } = render(
      <LoadingButton
        loadingText="Loading..."
        onClick={() => {}}
        isLoading={true}
      >
        Submit
      </LoadingButton>
    );

    // Initially loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Finish loading
    rerender(
      <LoadingButton
        loadingText="Loading..."
        onClick={() => {}}
        isLoading={false}
      >
        Submit
      </LoadingButton>
    );

    // Should show success state
    expect(screen.getByText('Done!')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('bg-green-500');

    // Wait for timer (600ms)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700));
    });

    // Should return to idle
    expect(screen.getByText('Submit')).toBeInTheDocument();
    expect(screen.queryByText('Done!')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).not.toHaveClass('bg-green-500');
  });
});
