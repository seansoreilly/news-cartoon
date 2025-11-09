# Testing Documentation

This document outlines the testing strategy, tools, and best practices used in the News Cartoon project.

## Testing Stack

- **Vitest**: Unit and integration test runner with JSdom environment
- **React Testing Library**: Component testing utilities
- **Mock Service Worker (MSW)**: API mocking for tests
- **Playwright**: End-to-end and cross-browser testing
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom matchers for DOM assertions

## Test Types and Locations

### Unit Tests
- **Location**: `src/**/__tests__/*.test.ts`
- **Purpose**: Test individual functions and services in isolation
- **Tools**: Vitest, vi.fn() for mocking
- **Examples**: Service methods, utility functions, store logic

### Component Tests
- **Location**: `src/components/**/__tests__/*.test.tsx`
- **Purpose**: Test React components in isolation with mocked dependencies
- **Tools**: React Testing Library, Vitest
- **Focus**: User interactions, rendering, prop handling

### Integration Tests
- **Location**: `src/**/__tests__/*.test.ts`
- **Purpose**: Test multiple components/services working together
- **Tools**: React Testing Library, Vitest, MSW
- **Focus**: Feature workflows, state management

### End-to-End Tests
- **Location**: `e2e/*.spec.ts`
- **Purpose**: Test complete user journeys in real browsers
- **Tools**: Playwright
- **Focus**: User workflows, cross-browser compatibility, mobile responsiveness

## Running Tests

### Unit/Integration Tests
```bash
# Run all tests in watch mode (development)
npm test

# Run tests in UI mode (interactive dashboard)
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run tests once (CI mode)
npm test -- --run

# Run tests for a specific file
npm test -- src/services/__tests__/newsService.test.ts

# Run tests matching a pattern
npm test -- --grep "caching"
```

### End-to-End Tests
```bash
# Run all E2E tests in headed mode
npx playwright test

# Run E2E tests in headed mode (see the browser)
npx playwright test --headed

# Run tests for a specific file
npx playwright test e2e/example.spec.ts

# Run tests for a specific browser
npx playwright test --project=chromium

# View E2E test report
npx playwright show-report
```

## Test Setup

### Global Setup (`src/test/setup.ts`)
- Imports Testing Library jest-dom matchers
- Initializes Mock Service Worker
- Mocks browser APIs (localStorage, geolocation, fetch)
- Sets up test environment variables

### MSW Handlers (`src/test/mocks/handlers.ts`)
- Defines mock responses for all API endpoints
- Includes handlers for:
  - News API (`http://localhost:3000/api/news/search`)
  - Gemini Concept API
  - Gemini Script API
  - Gemini Image Generation API

### MSW Server (`src/test/mocks/server.ts`)
- Initializes MSW server with handlers
- Automatically integrated into test setup

## Writing Tests

### Service Tests Example
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { newsService } from '../newsService';

describe('NewsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch news articles for a valid location', async () => {
    const result = await newsService.fetchNewsByLocation('Sydney');

    expect(result.articles).toHaveLength(3);
    expect(result.topic).toBe('Sydney');
  });

  it('should throw error for empty location', async () => {
    await expect(newsService.fetchNewsByLocation('')).rejects.toThrow();
  });
});
```

### Component Tests Example
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { NewsDisplay } from '../NewsDisplay';

describe('NewsDisplay', () => {
  it('should render news articles', () => {
    const articles = [
      { title: 'Test News', description: 'Test Description', url: '#' }
    ];

    render(<NewsDisplay articles={articles} />);

    expect(screen.getByText('Test News')).toBeInTheDocument();
  });

  it('should handle article selection', async () => {
    const onSelect = vi.fn();
    render(<NewsDisplay articles={articles} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Test News'));
    expect(onSelect).toHaveBeenCalled();
  });
});
```

### E2E Tests Example
```typescript
import { test, expect } from '@playwright/test';

test('user can search for news and view results', async ({ page }) => {
  await page.goto('/');

  // Search for news
  await page.fill('input[placeholder="Search"]', 'technology');
  await page.click('button:has-text("Search")');

  // Verify results appear
  await expect(page.locator('[data-testid="news-article"]').first()).toBeVisible();
});
```

## Best Practices

### 1. Test Naming
- Use clear, descriptive test names that explain what's being tested
- Follow pattern: "should [expected behavior] when [condition]"
- Example: "should return cached results when called twice"

### 2. Test Organization
- Group related tests using `describe()` blocks
- One assertion per test when possible
- Separate setup, execution, and assertion (AAA pattern)

### 3. Mocking
- Mock external dependencies (API calls, browser APIs)
- Mock at the service level, not the component level
- Use MSW for HTTP requests
- Use `vi.fn()` for function spies

### 4. Assertions
- Use specific assertions: `toEqual()` instead of `toBeTruthy()`
- Test behavior, not implementation
- Include error cases and edge cases

### 5. Async Testing
- Always `await` async operations
- Use `async/await` instead of callbacks
- Test error handling with `rejects.toThrow()`

### 6. Component Testing
- Test from the user's perspective
- Use `screen` queries instead of `getByTestId` when possible
- Test user interactions with `fireEvent` or `userEvent`
- Test accessibility attributes

## Pre-commit Hooks

The project uses Husky and lint-staged to automatically:
1. Run ESLint with auto-fix on staged files
2. Run related tests for modified files
3. Prevent commits with linting or test failures

To bypass hooks (not recommended):
```bash
git commit --no-verify
```

## Coverage Goals

Target coverage metrics:
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

Generate coverage report:
```bash
npm run test:coverage
```

## CI/CD Integration

GitHub Actions automatically runs:
1. Linting (ESLint)
2. Build verification (TypeScript + Vite)
3. Unit/Integration tests (Vitest)
4. End-to-End tests (Playwright)

Workflows are triggered on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

Test artifacts are uploaded to GitHub for review:
- Playwright HTML report
- Coverage reports

## Debugging Tests

### Vitest Debugging
```bash
# Run tests with debugging (requires VS Code debugger)
npm test -- --inspect-brk

# Use Vitest UI for interactive debugging
npm run test:ui
```

### Playwright Debugging
```bash
# Run tests with Playwright Inspector
npx playwright test --debug

# Record test interactions
npx playwright codegen http://localhost:5173

# View detailed trace
npx playwright show-trace trace.zip
```

## Common Issues and Solutions

### Issue: "Cannot find module" errors
**Solution**: Ensure imports use correct paths relative to the file location

### Issue: "Timeout of 5000ms exceeded"
**Solution**: Increase timeout or check if async operations are properly awaited

### Issue: MSW handler not intercepting requests
**Solution**: Verify the URL pattern matches exactly, check handler registration

### Issue: Component not rendering in tests
**Solution**: Verify all provider setup, check for required props, use `render()` from testing library

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Mock Service Worker Docs](https://mswjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Maintenance

- Review and update tests when features change
- Keep mock data synchronized with actual API responses
- Update E2E tests when user workflows change
- Monitor coverage metrics and aim to maintain 80%+ coverage
- Regularly update testing dependencies
