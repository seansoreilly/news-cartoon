# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**News Cartoon** is a React + TypeScript application that fetches local/keyword-based news and generates editorial cartoon concepts using the Google Gemini API. It uses Vite for bundling, Zustand for state management, and Tailwind CSS for styling.

### Key Architecture Patterns

**Three-layer architecture:**
1. **Services** (`src/services/`): External API integration and business logic
   - `newsService`: Fetches news via Express backend proxy (port 3001) to Google News RSS, with 5-min TTL caching and exponential backoff
   - `geminiService`: Three-step pipeline (concepts → script → image) using Gemini 3 Pro (text) and Gemini 3 Pro Image preview ("Nano Banana Pro")
   - `locationService`: Dual detection (GPS → OpenStreetMap, IP fallback via ipapi.co)

2. **Stores** (`src/store/`): Zustand-based state management
   - `locationStore` & `preferencesStore`: Persist to localStorage
   - `newsStore` & `cartoonStore`: Transient state only
   - Minimal side effects—stores manage state only, services handle API calls

3. **Components** (`src/components/`): UI layer with lazy loading
   - Layout wraps all routes; ErrorBoundary catches React errors
   - LoadingSpinner for Suspense fallback; ProgressIndicator for long operations
   - Each feature area has dedicated components (cartoon/, news/, location/)

**Error handling**: All services use typed error creators (`createNewsError`, `createCartoonError`, etc.) that return `IAppError` objects with code, message, statusCode, and details. Components catch and display these with ErrorFallback component.

**Rate limiting**: `ImageGenerationRateLimiter` tracks image generation (2 images/minute per session).

## Development Commands

```bash
npm run dev          # Start Vite (port 5173) + Express server (port 3001) concurrently
npm run dev:vite     # Vite dev server only
npm run dev:server   # Express backend only
npm run build        # TypeScript check + Vite bundle (output: dist/)
npm run lint         # Run ESLint on all files
npm test             # Run Vitest in watch mode
npm run test:ui      # Open Vitest UI dashboard
npm run test:coverage # Generate coverage report
npm run preview      # Preview production build locally
```

## Environment Setup

**Required variables** (add to `.env.local` or `.env.development`):
- `VITE_GOOGLE_API_KEY`: Google Gemini API key (required for cartoon generation)
- `VITE_ENV`: Set to `development` or `production`

**Optional:**
- `VITE_API_BASE_URL`: Backend endpoint (defaults to localhost:3001 in dev)
- `VITE_DEFAULT_NEWS_LIMIT`: Max articles to fetch (defaults to 10)
- `VITE_GEMINI_TEXT_MODEL`: Override text model (defaults to `gemini-3-pro-preview`)
- `VITE_GEMINI_IMAGE_MODEL`: Override image model (defaults to `gemini-3-pro-image-preview`)

⚠️ **Never commit `.env.development` or `.env.production`** — they're in .gitignore for security.

## Key Design Decisions

### Backend Proxy Architecture
- Express server on port 3001 proxies Google News RSS to avoid CORS and hide API patterns
- Parses complex RSS/XML structures with fallbacks for different field formats
- Returns normalized article structure regardless of RSS variations

### Caching Strategy
- **News service**: 5-minute TTL in-memory cache with lazy invalidation
- **Gemini service**: 1-hour TTL cache for images keyed by concept title
- Both use `getFromCache()`/`setCache()` with timestamp validation

### API Retry Logic
- Exponential backoff: `delay = baseDelay * 2^retryCount` (max 3 retries)
- Special handling for 429 (rate limit) with extended backoff
- Retryable errors: HTTP 429/500/502/503/504 + RATE_LIMIT_ERROR

### Image Generation Pipeline
1. Rate limiting check (2/min limit)
2. Cache check for existing image
3. Comic script generation if needed
4. Vision API call with verbose logging (`[methodName]` prefixes)
5. Multiple response parsing fallbacks (JSON → Markdown → defaults)

### Comic Strip Generation Flow
1. User provides news query (location or keyword)
2. `newsService.fetchNewsByLocation/Keyword()` → articles
3. `geminiService.generateCartoonConcepts()` → 5 concept options
4. User selects concept → `geminiService.generateComicScript()` → panel descriptions
5. Script + concept → `geminiService.generateCartoonImage()` → base64 PNG

### State Isolation
Each store handles a single concern:
- `locationStore`: Current geolocation with localStorage persistence
- `newsStore`: Fetched articles, loading state, errors
- `cartoonStore`: Generated concept, script, image, loading state
- `preferencesStore`: User settings persisted to localStorage
- `rateLimitStore`: Image generation cooldown tracking

Components dispatch store actions and derive UI from store state—no prop drilling needed.

## Common Tasks

### Adding a New Service
1. Create `src/services/newService.ts` with class instance exported
2. Add to `src/services/index.ts` exports
3. Use same error pattern: `createNewServiceError()` in `src/types/error.ts`
4. Implement caching if needed (see newsService for pattern)

### Adding a New Store
1. Create `src/store/newStore.ts` using `create()` from zustand
2. Add to `src/store/index.ts` exports
3. Add persistence middleware if needed: `persist(storeDefinition, { name: 'store-key' })`
4. Hooks automatically available via `useNewStore()`

### Adding Error Recovery UI
1. Wrap component in `<ErrorBoundary>`
2. Catch service errors in try/catch and pass to store's `setError()`
3. Display via `ErrorFallback` component with retry callback

### Debugging API Issues
- **Gemini API**: Check verbose console logs with `[methodName]` prefixes
- **API key**: Verify `import.meta.env.VITE_GOOGLE_API_KEY` is set
- **Rate limiting**: Check `ImageGenerationRateLimiter` logs
- **Response parsing**: Check `parseImageResponse()` and `parseScriptResponse()` methods
- **Backend issues**: Check dev-server.js logs on port 3001

## Testing Setup

- **Framework**: Vitest with jsdom environment
- **Setup file**: `src/test/setup.ts`
- **Component testing**: `@testing-library/react`
- **API mocking**: MSW for predictable responses
- **E2E excluded**: Playwright tests in `e2e/` excluded from unit test runs

### Running Tests
```bash
npm test                    # Watch mode for active development
npm run test:ui             # Visual test runner
npm run test:coverage       # Coverage report
npm test -- CartoonImage    # Run specific test file pattern
```

## Performance Considerations

- **Code splitting**: Pages lazy-loaded with `React.lazy()` + `Suspense`
- **Image caching**: Prevents redundant Gemini API calls (1-hour TTL)
- **News caching**: Reduces Google News RSS hits (5-min TTL)
- **Debounce**: Consider adding to search/location inputs to prevent API spam

## Notable Edge Cases

1. **Empty news response**: Services return empty array, UI shows "No results" state
2. **API timeout during image generation**: Exponential backoff covers transient failures
3. **Missing image data**: Vision API fallback logs actual response for debugging
4. **Geolocation denied**: LocationDetector falls back to manual entry
5. **Rate limit hit**: `ImageGenerationRateLimiter` enforces cooldown with user message
6. **RSS parsing failures**: Multiple field name fallbacks (TITLE/title, ITEM/item, etc.)

## Project Structure Patterns

### Service Pattern
```typescript
class ServiceName {
  private cache = new Map();

  async fetchData() {
    // Check cache
    const cached = this.getFromCache(key);
    if (cached) return cached;

    // Fetch with retry
    const data = await this.fetchWithRetry(url);

    // Cache and return
    this.setCache(key, data);
    return data;
  }
}
export const serviceInstance = new ServiceName();
```

### Store Pattern
```typescript
export const useFeatureStore = create<IFeatureState>((set) => ({
  data: null,
  loading: false,
  error: null,

  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      const data = await service.fetchData();
      set({ data, loading: false });
    } catch (error) {
      set({ error, loading: false });
    }
  },
}));
```

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
