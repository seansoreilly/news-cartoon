# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**News Cartoon** is a React + TypeScript application that fetches local/keyword-based news and generates editorial cartoon concepts using the Google Gemini API. It uses Vite for bundling, Zustand for state management, and Tailwind CSS for styling.

### Key Architecture Patterns

**Three-layer architecture:**
1. **Services** (`src/services/`): External API integration and business logic
   - `newsService`: Fetches news from GNews API with caching (5-min TTL) and exponential backoff retry logic
   - `geminiService`: Generates cartoon concepts, comic scripts, and images using Google Gemini API
   - `locationService`: Browser geolocation detection

2. **Stores** (`src/store/`): Zustand-based state management
   - Separate stores for location, news, cartoon, preferences, and rate limiting
   - Minimal side effects—stores manage state only, services handle API calls

3. **Components** (`src/components/`): UI layer with lazy loading
   - Layout wraps all routes; ErrorBoundary catches React errors
   - LoadingSpinner for Suspense fallback; ProgressIndicator for long operations
   - Each feature area has dedicated components (cartoon/, news/, location/)

**Error handling**: All services use typed error creators (`createNewsError`, `createCartoonError`, etc.) that return `IAppError` objects with code, message, statusCode, and details. Components catch and display these with ErrorFallback component.

**Rate limiting**: `ImageGenerationRateLimiter` utility tracks image generation calls to prevent exceeding API quotas.

## Development Commands

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # TypeScript check + Vite bundle (output: dist/)
npm run lint         # Run ESLint on all files
npm test             # Run Vitest in watch mode
npm run test:ui      # Open Vitest UI dashboard
npm run test:coverage # Generate coverage report
npm run preview      # Preview production build locally
```

## Environment Setup

**Required variables** (add to `.env.local` or use `.env.development` for dev):
- `VITE_GOOGLE_API_KEY`: Google Gemini API key (image generation requires API access)
- `VITE_ENV`: Set to `development` or `production`

**Optional:**
- `VITE_API_BASE_URL`: Backend endpoint (defaults to localhost:3000 in dev)

⚠️ **Never commit `.env.development` or `.env.production`** — they're in .gitignore for security.

## Key Design Decisions

### Caching Strategy
- **News service**: 5-minute TTL in-memory cache with expiration checks
- **Gemini service**: 1-hour TTL cache for generated images keyed by concept title
- Both use `getFromCache()`/`setCache()` with timestamp validation

### API Retry Logic
- Exponential backoff: `delay = baseDelay * 2^retryCount` (max 2 retries default)
- Special handling for 429 (rate limit) responses with extended backoff
- Errors propagate up as typed error objects

### Image Generation
- Rate limited: prevents multiple generations within configured intervals
- Falls back to cached images when available
- Comic script generated in-memory before calling vision API
- Detailed console logging for debugging API responses

### Comic Strip Generation Pipeline
1. User provides news query (location or keyword)
2. `newsService.fetchNewsByLocation/Keyword()` → articles
3. `geminiService.generateCartoonConcepts()` → 5 concept options
4. User selects concept → `geminiService.generateComicScript()` → panel descriptions
5. Script + concept → `geminiService.generateCartoonImage()` → base64 PNG

### State Isolation
Each store handles a single concern:
- `locationStore`: Current geolocation or user-selected location
- `newsStore`: Fetched articles, loading state, errors
- `cartoonStore`: Generated concept, script, image, loading state
- `preferencesStore`: User settings (updates to localStorage)
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
3. Hooks automatically available via `useNewStore()`

### Adding Error Recovery UI
1. Wrap component in `<ErrorBoundary>`
2. Catch service errors in try/catch and pass to store's `setError()`
3. Display via `ErrorFallback` component with retry callback

### Debugging API Issues
- Check console logs from `geminiService`—all API calls are verbose-logged with `[method]` prefixes
- Verify API key is set: `import.meta.env.VITE_GOOGLE_API_KEY`
- Rate limiting errors logged by `ImageGenerationRateLimiter`
- Check response structure in `parseImageResponse()` and `parseScriptResponse()`

## Testing Notes

- Vitest configured with jsdom (DOM testing) in `vite.config.ts`
- Setup file: `src/test/setup.ts` (imports test utilities)
- Use `@testing-library/react` for component testing
- Mock external APIs in tests (newsService, geminiService)

## Performance Considerations

- **Code splitting**: Pages lazy-loaded with `React.lazy()` + `Suspense`
- **Image caching**: Prevents redundant Gemini API calls for same concept
- **News caching**: 5-min TTL reduces API quota usage
- **Debounce**: Consider adding debounce to search/location inputs to prevent excessive API calls

## Notable Edge Cases

1. **Empty news response**: Services return empty array, UI shows "No results" state
2. **API timeout during image generation**: Exponential backoff covers transient failures; permanent failures throw typed error
3. **Missing image data**: Vision API fallback logs the actual response structure for debugging
4. **Geolocation denied**: LocationDetector handles gracefully; falls back to manual entry
5. **Rate limit hit during image gen**: `ImageGenerationRateLimiter` enforces cooldown with user-facing error message

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
