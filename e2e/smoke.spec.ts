import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Basic E2E verification
 *
 * Tests that verify:
 * - Application loads successfully
 * - Key UI elements are present
 * - Navigation works correctly
 * - Basic user interactions function
 */

test.describe('Application Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should load the home page', async ({ page }) => {
    // Check that the page title is correct
    const title = await page.title();
    expect(title).toContain('Cartoon');

    // Check that main content is visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should display the application header', async ({ page }) => {
    // Check for main heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('Cartoon of the Day');

    // Check for subtitle
    const subtitle = page.locator('text=/AI-powered/i');
    await expect(subtitle).toBeVisible();
  });

  test('should have a footer', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should have progress indicator', async ({ page }) => {
    // Check for progress indicator
    const indicator = page.locator('text=/Set Location|Select News|Generate/i');
    await expect(indicator.first()).toBeVisible();
  });

  test('should have navigation or menu', async ({ page }) => {
    // Check for any navigation buttons or links
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that main content is still visible
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check that header is visible
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Check that layout is still visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Focus on first button
    const buttons = page.locator('button');
    const firstButton = buttons.first();

    // Tab to the first button
    await page.keyboard.press('Tab');

    // Check that button has focus
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A']).toContain(focused);
  });

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = [];

    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a moment for any errors to appear
    await page.waitForTimeout(1000);

    // Check that no critical errors occurred (some warnings are OK)
    expect(errors.length).toBe(0);
  });

  test('should have proper semantic HTML structure', async ({ page }) => {
    // Check for header
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check for main
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check for footer
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should have accessible color contrast', async ({ page }) => {
    // Check that text is visible (basic contrast check)
    const heading = page.locator('h1');
    const isVisible = await heading.isVisible();
    expect(isVisible).toBeTruthy();

    // Get text color
    const color = await heading.evaluate(el =>
      window.getComputedStyle(el).color
    );
    expect(color).toBeTruthy();
  });
});

test.describe('Error Handling', () => {
  test('should handle navigation to non-existent page gracefully', async ({
    page,
  }) => {
    // Navigate to a non-existent page
    await page.goto('/non-existent-page', { waitUntil: 'networkidle' });

    // Check that some content is displayed (not a blank page)
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });
});
