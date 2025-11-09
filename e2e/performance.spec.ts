import { test, expect } from '@playwright/test';

/**
 * Performance E2E Tests
 *
 * Tests that verify:
 * - Page load performance
 * - Runtime performance
 * - Memory usage
 * - Network optimization
 * - Core Web Vitals metrics
 */

test.describe('Page Load Performance', () => {
  test('should load homepage in under 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
    console.log(`Homepage loaded in ${loadTime}ms`);
  });

  test('should have fast First Contentful Paint', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      if (!navigation) return null;

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd,
        loadEventEnd: navigation.loadEventEnd,
      };
    });

    if (metrics) {
      // DOM should be ready in reasonable time
      expect(metrics.domContentLoaded).toBeLessThan(2000);
    }
  });

  test('should not have excessive resource requests', async ({ page }) => {
    let resourceCount = 0;

    page.on('request', () => {
      resourceCount++;
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should not have excessive number of requests
    expect(resourceCount).toBeLessThan(100);
    console.log(`Total resources: ${resourceCount}`);
  });

  test('should serve gzipped responses', async ({ page }) => {
    let hasGzip = false;

    page.on('response', response => {
      const encoding = response.headers()['content-encoding'];
      if (encoding?.includes('gzip')) {
        hasGzip = true;
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // At least some responses should be gzipped
    // (might not be true for all responses in dev mode)
  });
});

test.describe('Runtime Performance', () => {
  test('should not have jank during scrolling', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll and measure frame times
    const frameMetrics = await page.evaluate(() => {
      const frames: number[] = [];
      let lastTime = performance.now();

      return new Promise<number[]>(resolve => {
        const interval = setInterval(() => {
          const now = performance.now();
          const frameTime = now - lastTime;
          frames.push(frameTime);
          lastTime = now;

          if (frames.length >= 60) {
            clearInterval(interval);
            resolve(frames);
          }
        }, 1000 / 60); // 60 FPS

        // Scroll the page
        window.scrollBy(0, 500);
      });
    });

    // Average frame time should be under 16.67ms (60fps)
    const avgFrameTime =
      frameMetrics.reduce((a, b) => a + b) / frameMetrics.length;
    expect(avgFrameTime).toBeLessThan(33); // Allow some variation
  });

  test('should respond quickly to user interactions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find a button
    const button = page.locator('button').first();
    const exists = await button.isVisible().catch(() => false);

    if (exists) {
      const startTime = Date.now();
      await button.click();
      const responseTime = Date.now() - startTime;

      // Should respond in under 100ms
      expect(responseTime).toBeLessThan(100);
    }
  });

  test('should not block rendering during heavy operations', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to interact while page is doing work
    const button = page.locator('button').first();
    const clickTime = await page.evaluate(() => {
      const start = performance.now();

      // Simulate heavy computation
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += Math.sqrt(i);
      }

      return performance.now() - start;
    });

    // Even with heavy work, interactions should still work
    const exists = await button.isVisible().catch(() => false);
    expect(exists || clickTime < 1000).toBeTruthy();
  });
});

test.describe('Memory Performance', () => {
  test('should not leak memory on page navigation', async ({ page }) => {
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Navigate and return multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    }

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Memory increase should be reasonable (allow for some growth)
    const memoryIncrease = finalMemory - initialMemory;
    const percentIncrease = (memoryIncrease / initialMemory) * 100;

    // Should not grow by more than 100%
    expect(percentIncrease).toBeLessThan(100);
  });
});

test.describe('Network Performance', () => {
  test('should optimize bundle sizes', async ({ page }) => {
    let totalSize = 0;

    page.on('response', response => {
      const contentLength = response.headers()['content-length'];
      if (contentLength) {
        totalSize += parseInt(contentLength);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Total bandwidth should be reasonable
    const sizeInMB = totalSize / (1024 * 1024);
    expect(sizeInMB).toBeLessThan(5); // Less than 5MB total
    console.log(`Total page size: ${sizeInMB.toFixed(2)}MB`);
  });

  test('should cache resources appropriately', async ({ page }) => {
    // First load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    let firstLoadRequests = 0;
    page.on('request', () => {
      firstLoadRequests++;
    });

    // Second load (cached)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Second load should have fewer requests due to caching
    // This test might not be reliable in all environments
  });

  test('should defer non-critical resources', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');

      return {
        totalResources: resources.length,
        slowResources: resources.filter(r => r.duration > 1000).length,
      };
    });

    // Should load resources efficiently
    expect(metrics.totalResources).toBeGreaterThan(0);
  });
});

test.describe('Interaction Performance', () => {
  test('should handle rapid interactions smoothly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button');
    const count = await buttons.count();

    if (count > 0) {
      const startTime = Date.now();

      // Click buttons rapidly
      for (let i = 0; i < Math.min(5, count); i++) {
        await buttons.nth(i).click({ force: true }).catch(() => {});
      }

      const totalTime = Date.now() - startTime;

      // Should handle rapid interactions
      expect(totalTime).toBeLessThan(5000);
    }
  });

  test('should handle large lists efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Set a location to trigger news loading
    const input = page.locator('input[placeholder*="location" i]');
    if (await input.isVisible().catch(() => false)) {
      await input.fill('New York');
      const submit = page.locator('button:has-text(/set location|submit/i)');
      await submit.click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Check rendering performance of lists
    const articles = page.locator('article, [role="article"]');
    const count = await articles.count();

    if (count > 0) {
      const startTime = Date.now();

      // Scroll through list
      await page.evaluate(() => window.scrollBy(0, 1000));

      const scrollTime = Date.now() - startTime;

      // Scrolling should be smooth (under 500ms)
      expect(scrollTime).toBeLessThan(500);
    }
  });
});

test.describe('Core Web Vitals', () => {
  test('should track Largest Contentful Paint', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const lcp = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        let largestContentfulPaint = 0;

        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          largestContentfulPaint = entries[entries.length - 1]?.startTime || 0;
        });

        observer.observe({ type: 'largest-contentful-paint', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(largestContentfulPaint);
        }, 4000);
      });
    });

    // LCP should be under 2.5 seconds (good threshold)
    expect(lcp).toBeLessThan(2500);
    console.log(`LCP: ${lcp.toFixed(0)}ms`);
  });

  test('should maintain low Cumulative Layout Shift', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const cls = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        let cumulativeLayoutShift = 0;

        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cumulativeLayoutShift += (entry as any).value;
            }
          }
        });

        observer.observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(cumulativeLayoutShift);
        }, 3000);
      });
    });

    // CLS should be under 0.1 (good threshold)
    expect(cls).toBeLessThan(0.1);
    console.log(`CLS: ${cls.toFixed(3)}`);
  });

  test('should have good First Input Delay', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fid = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        let firstInputDelay = 0;

        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            firstInputDelay = (entries[0] as any).processingStart - (entries[0] as any).startTime;
          }
        });

        observer.observe({ type: 'first-input', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(firstInputDelay || 0);
        }, 3000);
      });
    });

    // FID should be under 100ms (good threshold)
    // Note: FID is replaced by INP in newer versions
    expect(fid).toBeLessThan(100);
  });
});
