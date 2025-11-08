import type { CartoonData } from './cartoon';
import type { NewsData } from './news';
import type { LocationData } from './location';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type LocationApiResponse = ApiResponse<LocationData>;

export type NewsApiResponse = ApiResponse<NewsData>;

export type CartoonApiResponse = ApiResponse<CartoonData>;

export type ImageApiResponse = ApiResponse<{
  imagePath: string;
  imageUrl: string;
  filename: string;
  size: number;
  generatedAt: number;
}>;

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  windowMs: number;
}

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}
