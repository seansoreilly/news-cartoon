import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SettingsPage from '../SettingsPage';
import { useLocationStore } from '../../store/locationStore';
import { usePreferencesStore } from '../../store/preferencesStore';

// Mock the stores
vi.mock('../../store/locationStore');
vi.mock('../../store/preferencesStore');

describe('SettingsPage', () => {
  const mockSetLocation = vi.fn();
  const mockClearLocation = vi.fn();
  const mockSetTheme = vi.fn();
  const mockSetAutoRefresh = vi.fn();
  const mockSetNewsCount = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup location store mock
    (useLocationStore as any).mockReturnValue({
      location: { name: 'Melbourne', coordinates: { lat: 0, lng: 0 }, source: 'manual', timestamp: Date.now() },
      setLocation: mockSetLocation,
      clearLocation: mockClearLocation,
    });

    // Setup preferences store mock
    (usePreferencesStore as any).mockReturnValue({
      theme: 'auto',
      autoRefresh: false,
      newsCount: 10,
      setTheme: mockSetTheme,
      setAutoRefresh: mockSetAutoRefresh,
      setNewsCount: mockSetNewsCount,
    });
  });

  it('should render settings page with all sections', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Location Preferences')).toBeInTheDocument();
    expect(screen.getByText('Display Preferences')).toBeInTheDocument();
  });

  it('should display current location in input', () => {
    render(<SettingsPage />);

    const locationInput = screen.getByPlaceholderText('Enter your default location');
    expect(locationInput).toHaveValue('Melbourne');
  });

  it('should save location when save button is clicked', async () => {
    render(<SettingsPage />);

    const locationInput = screen.getByPlaceholderText('Enter your default location');
    const saveButton = screen.getByText('Save');

    fireEvent.change(locationInput, { target: { value: 'Sydney' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith({
        name: 'Sydney',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
        timestamp: expect.any(Number),
      });
    });

    expect(screen.getByText('Default location saved successfully!')).toBeInTheDocument();
  });

  it('should clear location when clear button is clicked', async () => {
    render(<SettingsPage />);

    const clearButton = screen.getByText('Clear saved location');
    fireEvent.click(clearButton);

    expect(mockClearLocation).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Location cleared successfully!')).toBeInTheDocument();
    });
  });

  it('should update theme preference', () => {
    render(<SettingsPage />);

    const themeSelect = screen.getByLabelText('Theme');
    fireEvent.change(themeSelect, { target: { value: 'dark' } });

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('should toggle auto-refresh preference', () => {
    render(<SettingsPage />);

    const autoRefreshToggle = screen.getByRole('switch', { name: /auto-refresh/i });
    fireEvent.click(autoRefreshToggle);

    expect(mockSetAutoRefresh).toHaveBeenCalledWith(true);
  });

  it('should update news count preference', () => {
    render(<SettingsPage />);

    const newsCountSlider = screen.getByLabelText(/Number of News Articles/);
    fireEvent.change(newsCountSlider, { target: { value: '15' } });

    expect(mockSetNewsCount).toHaveBeenCalledWith(15);
  });

  it('should show current news count value', () => {
    (usePreferencesStore as any).mockReturnValue({
      theme: 'auto',
      autoRefresh: false,
      newsCount: 15,
      setTheme: mockSetTheme,
      setAutoRefresh: mockSetAutoRefresh,
      setNewsCount: mockSetNewsCount,
    });

    render(<SettingsPage />);

    expect(screen.getByText('Number of News Articles (15)')).toBeInTheDocument();
  });

  it('should apply theme changes to document', () => {
    const { rerender } = render(<SettingsPage />);

    // Test dark theme
    (usePreferencesStore as any).mockReturnValue({
      theme: 'dark',
      autoRefresh: false,
      newsCount: 10,
      setTheme: mockSetTheme,
      setAutoRefresh: mockSetAutoRefresh,
      setNewsCount: mockSetNewsCount,
    });

    rerender(<SettingsPage />);

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Test light theme
    (usePreferencesStore as any).mockReturnValue({
      theme: 'light',
      autoRefresh: false,
      newsCount: 10,
      setTheme: mockSetTheme,
      setAutoRefresh: mockSetAutoRefresh,
      setNewsCount: mockSetNewsCount,
    });

    rerender(<SettingsPage />);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});