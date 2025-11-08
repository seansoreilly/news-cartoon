export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationData {
  name: string;
  coordinates: Coordinates;
  source: 'gps' | 'manual' | 'ip';
  timezone?: string;
  timestamp?: number;
}

export interface LocationDetectionResult {
  success: boolean;
  data?: LocationData;
  error?: string;
}
