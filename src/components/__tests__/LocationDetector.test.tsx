import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocationDetector from '../location/LocationDetector';
import { useLocationStore } from '../../store/locationStore';
import { locationService } from '../../services/locationService';
import { AppErrorHandler } from '../../utils/errorHandler';

// Mock the service and store
vi.mock('../../store/locationStore');
vi.mock('../../services/locationService');
vi.mock('../../utils/errorHandler');

describe('LocationDetector', () => {
  const mockLocationData = {
    name: 'New York, NY',
    coordinates: { lat: 40.7128, lng: -74.006 },
    source: 'manual' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useLocationStore as any).mockReturnValue({
      location: null,
      setLocation: vi.fn(),
      clearLocation: vi.fn(),
      setError: vi.fn(),
    });
    (locationService.getLocationFromGPS as any).mockResolvedValue(mockLocationData);
    (locationService.getLocationFromIP as any).mockResolvedValue(mockLocationData);
    (locationService.detectLocation as any).mockResolvedValue(mockLocationData);
    (AppErrorHandler.handleError as any).mockImplementation((err: any) => ({
      code: 'LOCATION_ERROR',
      message: err?.message || 'Location error',
      statusCode: 400,
    }));
    (AppErrorHandler.getUserMessage as any).mockImplementation(
      (error: any) => error?.message || 'Failed to detect location'
    );
  });

  describe('Rendering', () => {
    it('should display detection method buttons', () => {
      render(<LocationDetector />);
      expect(screen.getByRole('button', { name: /detect my location/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /set search keywords/i })).toBeInTheDocument();
      // GPS/IP are no longer separate controls; detectLocation() tries GPS then IP internally
      expect(screen.queryByRole('button', { name: /gps/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /ip address/i })).not.toBeInTheDocument();
    });

    it('should display manual location input form', () => {
      render(<LocationDetector />);
      expect(screen.getByPlaceholderText(/enter search keywords/i)).toBeInTheDocument();
    });

    it('should display submit button for manual entry', () => {
      render(<LocationDetector />);
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });
  });

  describe('Detection Errors and Loading', () => {
    it('should show loading state during detection', async () => {
      const user = userEvent.setup();
      let resolveDetect: (value: typeof mockLocationData) => void = () => {};
      (locationService.detectLocation as any).mockImplementation(
        () => new Promise((resolve) => { resolveDetect = resolve; })
      );

      render(<LocationDetector />);
      const detectButton = screen.getByRole('button', { name: /detect my location/i });

      await user.click(detectButton);

      // Button should be disabled and busy during loading
      expect(detectButton).toBeDisabled();
      expect(detectButton).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText(/detecting your location/i)).toBeInTheDocument();

      resolveDetect(mockLocationData);

      await waitFor(() => {
        expect(detectButton).toBeEnabled();
      });
      expect(detectButton).toHaveAttribute('aria-busy', 'false');
    });

    it('should handle detection error', async () => {
      const user = userEvent.setup();
      const mockSetError = vi.fn();
      const error = new Error('Could not detect location');

      (locationService.detectLocation as any).mockRejectedValue(error);
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: mockSetError,
      });

      render(<LocationDetector />);
      await user.click(screen.getByRole('button', { name: /detect my location/i }));

      await waitFor(() => {
        expect(AppErrorHandler.handleError).toHaveBeenCalledWith(error);
      });
      expect(await screen.findByText(/could not detect location/i)).toBeInTheDocument();
      expect(mockSetError).toHaveBeenCalledWith('Could not detect location');
    });
  });

  describe('Auto Detect', () => {
    it('should call auto detect service', async () => {
      const user = userEvent.setup();
      render(<LocationDetector />);
      const autoButton = screen.getByRole('button', { name: /detect my location/i });

      await user.click(autoButton);

      await waitFor(() => {
        expect(locationService.detectLocation).toHaveBeenCalled();
      });
    });

    it('should set location on auto detect success', async () => {
      const user = userEvent.setup();
      const mockSetLocation = vi.fn();
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: mockSetLocation,
        clearLocation: vi.fn(),
        setError: vi.fn(),
      });

      render(<LocationDetector />);
      const autoButton = screen.getByRole('button', { name: /detect my location/i });

      await user.click(autoButton);

      await waitFor(() => {
        expect(mockSetLocation).toHaveBeenCalledWith(mockLocationData);
      });
    });
  });

  describe('Manual Location Entry', () => {
    it('should accept location input', async () => {
      const user = userEvent.setup();
      render(<LocationDetector />);

      const input = screen.getByPlaceholderText(/enter search keywords/i);
      await user.type(input, 'San Francisco, CA');

      expect(input).toHaveValue('San Francisco, CA');
    });

    it('should submit manual location on form submit', async () => {
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
      await user.type(input, 'Los Angeles, CA');

      const submitButton = screen.getByRole('button', { name: /search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetLocation).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Los Angeles, CA',
            source: 'manual',
          })
        );
      });
    });

    it('should clear input after successful submission', async () => {
      const user = userEvent.setup();
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: vi.fn(),
      });

      render(<LocationDetector />);

      const input = screen.getByPlaceholderText(/enter search keywords/i) as HTMLInputElement;
      await user.type(input, 'Boston, MA');

      const submitButton = screen.getByRole('button', { name: /search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should show error when submitting empty location', async () => {
      render(<LocationDetector />);

      // Submit button is disabled while input is empty, so submit the form directly
      const submitButton = screen.getByRole('button', { name: /search/i });
      expect(submitButton).toBeDisabled();
      const form = submitButton.closest('form');
      if (!form) throw new Error('form not found');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/please enter search keywords/i)).toBeInTheDocument();
      });
    });

    it('should show error when submitting whitespace only', async () => {
      const user = userEvent.setup();
      render(<LocationDetector />);

      const input = screen.getByPlaceholderText(/enter search keywords/i);
      await user.type(input, '   ');

      // Submit button stays disabled for whitespace-only input, so submit the form directly
      const submitButton = screen.getByRole('button', { name: /search/i });
      expect(submitButton).toBeDisabled();
      const form = submitButton.closest('form');
      if (!form) throw new Error('form not found');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/please enter search keywords/i)).toBeInTheDocument();
      });
    });
  });

  describe('Location Display', () => {
    it('should display current location when set', () => {
      (useLocationStore as any).mockReturnValue({
        location: mockLocationData,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: vi.fn(),
      });

      render(<LocationDetector />);

      expect(screen.getByText(mockLocationData.name)).toBeInTheDocument();
    });

    it('should show change location button when location is set', () => {
      (useLocationStore as any).mockReturnValue({
        location: mockLocationData,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: vi.fn(),
      });

      render(<LocationDetector />);

      expect(screen.getByRole('button', { name: /change search keywords/i })).toBeInTheDocument();
    });

    it('should clear location when change button clicked', async () => {
      const user = userEvent.setup();
      const mockClearLocation = vi.fn();
      (useLocationStore as any).mockReturnValue({
        location: mockLocationData,
        setLocation: vi.fn(),
        clearLocation: mockClearLocation,
        setError: vi.fn(),
      });

      render(<LocationDetector />);

      const changeButton = screen.getByRole('button', { name: /change search keywords/i });
      await user.click(changeButton);

      expect(mockClearLocation).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should update store error on detection failure', async () => {
      const user = userEvent.setup();
      const mockSetError = vi.fn();

      (locationService.detectLocation as any).mockRejectedValue(
        new Error('Detection failed')
      );
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: mockSetError,
      });

      render(<LocationDetector />);

      const detectButton = screen.getByRole('button', { name: /detect my location/i });
      await user.click(detectButton);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalled();
      });
    });

    it('should clear error on successful detection', async () => {
      const user = userEvent.setup();
      const mockSetError = vi.fn();
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: mockSetError,
      });

      render(<LocationDetector />);

      const detectButton = screen.getByRole('button', { name: /detect my location/i });
      await user.click(detectButton);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('State Management', () => {
    it('should reset error when attempting new detection', async () => {
      const user = userEvent.setup();
      const mockSetError = vi.fn();
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: mockSetError,
      });

      render(<LocationDetector />);

      // First attempt with error
      (locationService.detectLocation as any).mockRejectedValueOnce(
        new Error('First error')
      );
      const detectButton = screen.getByRole('button', { name: /detect my location/i });
      await user.click(detectButton);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalled();
      });

      // Clear the mock calls
      vi.clearAllMocks();

      // Second attempt should reset error first
      (locationService.detectLocation as any).mockResolvedValueOnce(mockLocationData);
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: mockSetError,
      });

      await user.click(detectButton);

      await waitFor(() => {
        expect(locationService.detectLocation).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      render(<LocationDetector />);

      expect(screen.getByRole('button', { name: /detect my location/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /set search keywords/i })).toBeInTheDocument();
    });

    it('should have accessible input', () => {
      render(<LocationDetector />);

      const input = screen.getByPlaceholderText(/enter search keywords/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should have accessible form structure', () => {
      render(<LocationDetector />);

      const form = screen.getByRole('button', { name: /search/i }).closest('form');
      expect(form).toBeInTheDocument();
    });
  });
});
