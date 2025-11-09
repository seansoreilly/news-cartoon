# Testing Documentation

This document provides comprehensive information about the testing infrastructure for the News Cartoon application.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Unit Tests](#unit-tests)
5. [Integration Tests](#integration-tests)
6. [E2E Tests](#e2e-tests)
7. [Performance Tests](#performance-tests)
8. [Coverage Reports](#coverage-reports)
9. [Debugging Tests](#debugging-tests)
10. [Best Practices](#best-practices)

## Overview

The News Cartoon project uses a comprehensive multi-layer testing strategy:

- **Unit Tests**: Test individual functions, services, and stores in isolation
- **Integration Tests**: Test component-store interactions and workflows
- **Component Tests**: Test React components with React Testing Library
- **E2E Tests**: Test complete user workflows with Playwright
- **Performance Tests**: Measure and validate performance metrics

### Test Statistics

- **Unit Tests**: 40+ tests (services, stores, utilities)
- **Component Tests**: 60+ tests (UI components and interactions)
- **Integration Tests**: 15+ tests (workflows and cross-component interactions)
- **E2E Tests**: 80+ tests (user journeys, accessibility, responsiveness, performance)
- **Total**: 195+ tests providing comprehensive coverage

## Test Structure

```
project/
├── src/
│   ├── components/__tests__/   # Component tests
│   ├── services/__tests__/     # Service tests
│   ├── store/__tests__/        # Store tests
│   ├── utils/__tests__/        # Utility tests
│   └── test/
│       └── mocks/
│           ├── handlers.ts
│           ├── server.ts
│           └── __tests__/
├── e2e/                         # End-to-End tests
│   ├── smoke.spec.ts
│   ├── workflow.spec.ts
│   ├── accessibility.spec.ts
│   ├── responsive.spec.ts
│   └── performance.spec.ts
└── playwright.config.ts
```

## Running Tests

### Unit and Component Tests

```bash
# Run all unit and component tests in watch mode
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests and open interactive UI
npm run test:ui

# Run specific test file
npm test -- LocationDetector.test.tsx

# Run tests matching pattern
npm test -- --grep "should handle"
```

### E2E Tests

```bash
# Run all E2E tests in headed mode (see the browser)
npx playwright test e2e/ --headed

# Run specific E2E test file
npx playwright test e2e/smoke.spec.ts

# Run in debug mode
npx playwright test --debug

# View test results HTML report
npx playwright show-report
```

## Unit Tests

Unit tests verify individual functions and modules in isolation.

### Services Tests
- newsService.test.ts: News fetching, caching, error handling
- geminiService.test.ts: Gemini API integration
- locationService.test.ts: Location detection

### Stores Tests
- locationStore.test.ts: Location state management
- newsStore.test.ts: News state and article selection
- cartoonStore.test.ts: Cartoon generation state
- preferencesStore.test.ts: User preferences storage

### Utilities Tests
- errorHandler.test.ts: Error handling and formatting
- rateLimiter.test.ts: Rate limiting logic

## Integration Tests

Located in `src/components/__tests__/Integration.test.tsx`

Tests complete workflows:
1. Location → News → Cartoon Pipeline
2. Store Synchronization
3. Error Handling across layers

## E2E Tests

### Smoke Tests
Basic functionality: loads, UI visible, navigation works, no errors

### Workflow Tests
User journeys: location selection, news display, cartoon generation, settings

### Accessibility Tests
Keyboard navigation, ARIA attributes, focus management, color contrast, screen reader support

### Responsive Design Tests
Mobile (Pixel 5, iPhone 12), Tablet (iPad Pro), Desktop, Cross-browser compatibility

### Performance Tests
Load performance, runtime performance, memory usage, network optimization, Core Web Vitals

## Best Practices

### Writing Tests

1. Use descriptive test names
2. Follow Arrange-Act-Assert pattern
3. Use React Testing Library best practices
4. Mock external dependencies
5. Test user behavior, not implementation

### Organizing Tests

1. One test file per component/module
2. Group related tests with `describe`
3. Use `beforeEach` for setup
4. Use `afterEach` for cleanup
5. Keep tests focused and independent

## Troubleshooting

### Tests Timing Out
```bash
npm test -- --testTimeout=10000
npx playwright test --timeout=30000
```

### Flaky Tests
- Avoid hardcoded delays
- Use `waitFor` for async operations
- Mock network requests
- Ensure test isolation

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Mock Service Worker](https://mswjs.io/)
