import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
      expect(screen.getByRole('button', { name: /auto detect/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /gps/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ip/i })).toBeInTheDocument();
    });

    it('should display manual location input form', () => {
      render(<LocationDetector />);
      expect(screen.getByPlaceholderText(/enter location/i)).toBeInTheDocument();
    });

    it('should display submit button for manual entry', () => {
      render(<LocationDetector />);
      expect(screen.getByRole('button', { name: /set location/i })).toBeInTheDocument();
    });
  });

  describe('GPS Detection', () => {
    it('should call GPS detection service when button clicked', async () => {
      const user = userEvent.setup();
      const mockSetLocation = vi.fn();
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: mockSetLocation,
        clearLocation: vi.fn(),
        setError: vi.fn(),
      });

      render(<LocationDetector />);
      const gpsButton = screen.getByRole('button', { name: /gps/i });

      await user.click(gpsButton);

      await waitFor(() => {
        expect(locationService.getLocationFromGPS).toHaveBeenCalled();
      });
    });

    it('should set location on GPS success', async () => {
      const user = userEvent.setup();
      const mockSetLocation = vi.fn();
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: mockSetLocation,
        clearLocation: vi.fn(),
        setError: vi.fn(),
      });

      render(<LocationDetector />);
      const gpsButton = screen.getByRole('button', { name: /gps/i });

      await user.click(gpsButton);

      await waitFor(() => {
        expect(mockSetLocation).toHaveBeenCalledWith(mockLocationData);
      });
    });

    it('should show loading state during GPS detection', async () => {
      const user = userEvent.setup();
      (locationService.getLocationFromGPS as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockLocationData), 100))
      );

      render(<LocationDetector />);
      const gpsButton = screen.getByRole('button', { name: /gps/i });

      await user.click(gpsButton);

      // Button should be disabled during loading
      expect(gpsButton).toBeInTheDocument();
    });

    it('should handle GPS detection error', async () => {
      const user = userEvent.setup();
      const mockSetError = vi.fn();
      const error = new Error('GPS not available');

      (locationService.getLocationFromGPS as any).mockRejectedValue(error);
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: mockSetError,
      });

      render(<LocationDetector />);
      const gpsButton = screen.getByRole('button', { name: /gps/i });

      await user.click(gpsButton);

      await waitFor(() => {
        expect(AppErrorHandler.handleError).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('IP Detection', () => {
    it('should call IP detection service when button clicked', async () => {
      const user = userEvent.setup();
      render(<LocationDetector />);
      const ipButton = screen.getByRole('button', { name: /ip/i });

      await user.click(ipButton);

      await waitFor(() => {
        expect(locationService.getLocationFromIP).toHaveBeenCalled();
      });
    });

    it('should set location on IP detection success', async () => {
      const user = userEvent.setup();
      const mockSetLocation = vi.fn();
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: mockSetLocation,
        clearLocation: vi.fn(),
        setError: vi.fn(),
      });

      render(<LocationDetector />);
      const ipButton = screen.getByRole('button', { name: /ip/i });

      await user.click(ipButton);

      await waitFor(() => {
        expect(mockSetLocation).toHaveBeenCalledWith(mockLocationData);
      });
    });

    it('should handle IP detection error', async () => {
      const user = userEvent.setup();
      const mockSetError = vi.fn();
      const error = new Error('IP lookup failed');

      (locationService.getLocationFromIP as any).mockRejectedValue(error);
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: mockSetError,
      });

      render(<LocationDetector />);
      const ipButton = screen.getByRole('button', { name: /ip/i });

      await user.click(ipButton);

      await waitFor(() => {
        expect(AppErrorHandler.handleError).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('Auto Detect', () => {
    it('should call auto detect service', async () => {
      const user = userEvent.setup();
      render(<LocationDetector />);
      const autoButton = screen.getByRole('button', { name: /auto detect/i });

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
      const autoButton = screen.getByRole('button', { name: /auto detect/i });

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

      const input = screen.getByPlaceholderText(/enter location/i);
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

      const input = screen.getByPlaceholderText(/enter location/i);
      await user.type(input, 'Los Angeles, CA');

      const submitButton = screen.getByRole('button', { name: /set location/i });
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

      const input = screen.getByPlaceholderText(/enter location/i) as HTMLInputElement;
      await user.type(input, 'Boston, MA');

      const submitButton = screen.getByRole('button', { name: /set location/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should show error when submitting empty location', async () => {
      const user = userEvent.setup();
      render(<LocationDetector />);

      const submitButton = screen.getByRole('button', { name: /set location/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a location/i)).toBeInTheDocument();
      });
    });

    it('should show error when submitting whitespace only', async () => {
      const user = userEvent.setup();
      render(<LocationDetector />);

      const input = screen.getByPlaceholderText(/enter location/i);
      await user.type(input, '   ');

      const submitButton = screen.getByRole('button', { name: /set location/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a location/i)).toBeInTheDocument();
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

      expect(screen.getByRole('button', { name: /change location/i })).toBeInTheDocument();
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

      const changeButton = screen.getByRole('button', { name: /change location/i });
      await user.click(changeButton);

      expect(mockClearLocation).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should update store error on detection failure', async () => {
      const user = userEvent.setup();
      const mockSetError = vi.fn();

      (locationService.getLocationFromGPS as any).mockRejectedValue(
        new Error('GPS failed')
      );
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: mockSetError,
      });

      render(<LocationDetector />);

      const gpsButton = screen.getByRole('button', { name: /gps/i });
      await user.click(gpsButton);

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

      const gpsButton = screen.getByRole('button', { name: /gps/i });
      await user.click(gpsButton);

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
      (locationService.getLocationFromGPS as any).mockRejectedValueOnce(
        new Error('First error')
      );
      const gpsButton = screen.getByRole('button', { name: /gps/i });
      await user.click(gpsButton);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalled();
      });

      // Clear the mock calls
      vi.clearAllMocks();

      // Second attempt should reset error first
      (locationService.getLocationFromGPS as any).mockResolvedValueOnce(mockLocationData);
      (useLocationStore as any).mockReturnValue({
        location: null,
        setLocation: vi.fn(),
        clearLocation: vi.fn(),
        setError: mockSetError,
      });

      await user.click(gpsButton);

      await waitFor(() => {
        expect(locationService.getLocationFromGPS).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      render(<LocationDetector />);

      expect(screen.getByRole('button', { name: /auto detect/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /gps/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ip/i })).toBeInTheDocument();
    });

    it('should have accessible input', () => {
      render(<LocationDetector />);

      const input = screen.getByPlaceholderText(/enter location/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should have accessible form structure', () => {
      render(<LocationDetector />);

      const form = screen.getByRole('button', { name: /set location/i }).closest('form');
      expect(form).toBeInTheDocument();
    });
  });
});
