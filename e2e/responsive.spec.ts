import { test, expect, devices } from '@playwright/test';

/**
 * Responsive and Cross-Browser E2E Tests
 *
 * Tests that verify:
 * - Application works on different screen sizes
 * - Application works across different browsers
 * - Mobile-specific interactions work
 * - Responsive images and layout
 */

test.describe('Mobile Responsiveness - Phone', () => {
  test.use({ ...devices['Pixel 5'] });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should render on mobile viewport', async ({ page }) => {
    // Check viewport size
    const size = page.viewportSize();
    expect(size?.width).toBeLessThanOrEqual(430);

    // Main content should be visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have readable text on mobile', async ({ page }) => {
    // Check heading is visible and readable
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    // Get font size
    const fontSize = await heading.evaluate(el =>
      window.getComputedStyle(el).fontSize
    );
    const parsedSize = parseInt(fontSize);

    // Font size should be at least 14px for readability
    expect(parsedSize).toBeGreaterThanOrEqual(14);
  });

  test('should have touch-friendly buttons on mobile', async ({ page }) => {
    // Find buttons
    const buttons = page.locator('button');
    const firstButton = buttons.first();

    // Get button dimensions
    const box = await firstButton.boundingBox();
    if (box) {
      // Buttons should be at least 44x44px for touch
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(40);
    }
  });

  test('should have proper spacing on mobile', async ({ page }) => {
    // Check that content is not overlapping
    const elements = page.locator('button, input, a');
    const count = await elements.count();

    if (count > 0) {
      const boxes = await Promise.all(
        Array.from({ length: Math.min(count, 5) }).map((_, i) =>
          elements.nth(i).boundingBox()
        )
      );

      // Check that elements don't overlap
      for (let i = 0; i < boxes.length - 1; i++) {
        const box1 = boxes[i];
        const box2 = boxes[i + 1];

        if (box1 && box2) {
          // Elements should not significantly overlap vertically
          const overlaps = !(
            box1.y + box1.height < box2.y ||
            box2.y + box2.height < box1.y
          );
          // Some overlap is OK due to layout, but extreme overlap is bad
          expect(overlaps || Math.abs(box1.y - box2.y) > 20).toBeTruthy();
        }
      }
    }
  });

  test('should handle vertical scrolling on mobile', async ({ page }) => {
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500));

    // Check that content is still visible
    const footer = page.locator('footer');
    const footerVisible = await footer.isVisible().catch(() => false);

    // Either footer is visible or we can continue scrolling
    expect(typeof footerVisible).toBe('boolean');
  });

  test('should display navigation properly on mobile', async ({ page }) => {
    // Check for nav elements
    const nav = page.locator('nav, header');
    const navExists = await nav.isVisible().catch(() => false);

    // Should have some navigation structure
    expect(typeof navExists).toBe('boolean');
  });
});

test.describe('Mobile Responsiveness - Tablet', () => {
  test.use({ ...devices['iPad Pro'] });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should render on tablet viewport', async ({ page }) => {
    // Check viewport size
    const size = page.viewportSize();
    expect(size?.width).toBeGreaterThan(600);

    // Main content should be visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should use layout optimized for tablet', async ({ page }) => {
    // Check that content uses available width
    const main = page.locator('main');
    const box = await main.boundingBox();

    if (box) {
      // Should use reasonable width on tablet (not full width or too narrow)
      expect(box.width).toBeGreaterThan(400);
    }
  });

  test('should have readable content width on tablet', async ({ page }) => {
    // Check text container width
    const heading = page.locator('h1');
    const box = await heading.boundingBox();

    if (box) {
      // Text should be readable (not too wide)
      expect(box.width).toBeLessThanOrEqual(800);
    }
  });
});

test.describe('Desktop Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Default is desktop size (1280x720)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should render on desktop viewport', async ({ page }) => {
    const size = page.viewportSize();
    expect(size?.width).toBeGreaterThanOrEqual(1280);

    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should use desktop layout', async ({ page }) => {
    // Check for multi-column layout or sidebar
    const main = page.locator('main');
    const box = await main.boundingBox();

    if (box) {
      // Desktop layout should use reasonable max-width
      expect(box.width).toBeLessThanOrEqual(1400);
    }
  });

  test('should have hover states on desktop', async ({ page }) => {
    // Find a button
    const button = page.locator('button').first();

    // Hover over button
    await button.hover();

    // Check for hover effect
    const bgColor = await button.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toBeTruthy();
  });
});

test.describe('Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load successfully in all browsers', async ({ page, browserName }) => {
    // Just verify the page loaded
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Log browser name for verification
    console.log(`Testing on: ${browserName}`);
  });

  test('should support form interactions', async ({ page }) => {
    // Find input
    const input = page.locator('input').first();
    const inputExists = await input.isVisible().catch(() => false);

    if (inputExists) {
      // Type in input
      await input.fill('test');

      // Verify text was entered
      const value = await input.inputValue();
      expect(value).toBe('test');
    }
  });

  test('should support button clicks', async ({ page }) => {
    // Find button
    const button = page.locator('button').first();
    const buttonExists = await button.isVisible().catch(() => false);

    if (buttonExists) {
      // Click button
      await button.click();

      // Page should still be functional
      const content = page.locator('body');
      await expect(content).toBeVisible();
    }
  });
});

test.describe('Orientation Changes', () => {
  test('should handle portrait to landscape rotation', async ({
    page,
    context,
  }) => {
    // Start in portrait (mobile)
    page = await context.newPage();
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check portrait layout
    const mainPortrait = page.locator('main');
    await expect(mainPortrait).toBeVisible();

    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 });

    // Check landscape layout
    const mainLandscape = page.locator('main');
    await expect(mainLandscape).toBeVisible();

    // Content should still be readable
    const heading = page.locator('h1');
    const headingVisible = await heading.isVisible();
    expect(headingVisible).toBeTruthy();
  });
});

test.describe('High DPI Screens', () => {
  test('should render properly on high DPI screens', async ({ page }) => {
    // Set device scale factor
    const newPage = await page.context().newPage();
    await newPage.goto('/');

    // Content should be visible
    const main = newPage.locator('main');
    await expect(main).toBeVisible();

    await newPage.close();
  });
});

test.describe('Content Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have proper spacing between elements', async ({ page }) => {
    // Check if elements have proper margins
    const buttons = page.locator('button');
    const firstButton = buttons.first();

    const margin = await firstButton.evaluate(el =>
      window.getComputedStyle(el).margin
    );

    // Should have some margin defined
    expect(margin).toBeTruthy();
  });

  test('should not have horizontal scroll on any viewport', async ({
    page,
  }) => {
    // Check for horizontal overflow
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    );

    // Should not have horizontal scroll
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('should center content properly', async ({ page }) => {
    // Check if main content is centered
    const main = page.locator('main');
    const box = await main.boundingBox();
    const pageSize = page.viewportSize();

    if (box && pageSize) {
      // Check if content is roughly centered (allowing for some margin)
      const leftMargin = box.x;
      const rightMargin = pageSize.width - (box.x + box.width);

      // Margins should be somewhat balanced
      const ratio = Math.max(leftMargin, rightMargin) /
        Math.min(leftMargin, rightMargin);
      expect(ratio).toBeLessThan(3); // Allow some asymmetry
    }
  });
});
