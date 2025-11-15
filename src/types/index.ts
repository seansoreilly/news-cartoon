// Re-export all types from domain-specific files
export type {
  Coordinates,
  LocationData,
  LocationDetectionResult,
} from './location';

export type {
  NewsSource,
  NewsArticle,
  NewsResponse,
  NewsData,
} from './news';

export type {
  CartoonConcept,
  CartoonData,
  ComicPanel,
  ComicScript,
  CartoonGenerationRequest,
  CartoonGenerationResponse,
} from './cartoon';

export type {
  ApiResponse,
  ApiError,
  LocationApiResponse,
  NewsApiResponse,
  CartoonApiResponse,
  ImageApiResponse,
  RateLimitInfo,
  ApiConfig,
} from './api';

export type {
  IAppError,
  ILocationError,
  INewsError,
  ICartoonError,
  IRateLimitError,
  IValidationError,
  ErrorHandler,
} from './error';

export {
  createAppError,
  createLocationError,
  createNewsError,
  createCartoonError,
  createRateLimitError,
  createValidationError,
} from './error';

// User preferences type
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  sortBy: 'popularity' | 'recency';
  autoGenerate: boolean;
  autoRefresh: boolean;
  newsCount: number;
}

// Rate limiting type
export interface RateLimitEntry {
  timestamp: number;
  count: number;
}
