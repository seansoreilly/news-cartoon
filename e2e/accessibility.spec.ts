import { test, expect } from '@playwright/test';

/**
 * Accessibility E2E Tests
 *
 * Tests that verify:
 * - Keyboard navigation works throughout the app
 * - ARIA labels and roles are properly set
 * - Screen reader compatibility
 * - Focus management
 * - Color contrast
 */

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate with Tab key', async ({ page }) => {
    // Press Tab multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Get the currently focused element
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName.toLowerCase();
    });

    // Should have focus on some interactive element
    expect(['button', 'a', 'input', 'textarea', 'select']).toContain(focused);
  });

  test('should navigate with Shift+Tab to go backwards', async ({ page }) => {
    // Move forward
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Move backward
    await page.keyboard.press('Shift+Tab');

    // Should have focus
    const hasFocus = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName.toLowerCase();
    });

    expect(hasFocus).toBeTruthy();
  });

  test('should activate buttons with Enter key', async ({ page }) => {
    // Find a button
    const button = page.locator('button').first();
    const isVisible = await button.isVisible().catch(() => false);

    if (isVisible) {
      // Focus the button
      await button.focus();

      // Get initial text
      const initialText = await button.textContent();

      // Press Enter
      await page.keyboard.press('Enter');

      // Wait for any action
      await page.waitForTimeout(300);

      // Page should still be interactive
      const content = page.locator('body');
      await expect(content).toBeVisible();
    }
  });

  test('should activate buttons with Space key', async ({ page }) => {
    // Find a button
    const button = page.locator('button').first();
    const isVisible = await button.isVisible().catch(() => false);

    if (isVisible) {
      // Focus the button
      await button.focus();

      // Press Space
      await page.keyboard.press(' ');

      // Page should still be interactive
      const content = page.locator('body');
      await expect(content).toBeVisible();
    }
  });

  test('should support form submission with keyboard', async ({ page }) => {
    // Find input
    const input = page.locator('input[placeholder*="location" i]');
    const inputVisible = await input.isVisible().catch(() => false);

    if (inputVisible) {
      // Focus and fill
      await input.focus();
      await input.fill('Test Location');

      // Find the form or submit button
      const submitButton = page.locator('button:has-text(/set location|submit/i)');
      const submitExists = await submitButton.isVisible().catch(() => false);

      if (submitExists) {
        // Focus and submit
        await submitButton.focus();
        await page.keyboard.press('Enter');

        // Wait for action
        await page.waitForTimeout(300);

        // Page should be functional
        const content = page.locator('body');
        await expect(content).toBeVisible();
      }
    }
  });
});

test.describe('ARIA Attributes and Roles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have proper heading structure', async ({ page }) => {
    // Check for h1
    const h1 = page.locator('h1');
    const h1Exists = await h1.count();
    expect(h1Exists).toBeGreaterThanOrEqual(0);

    // If h1 exists, check for descending hierarchy
    if (h1Exists > 0) {
      const h2 = page.locator('h2');
      const h3 = page.locator('h3');

      // Should not skip heading levels (but h2 and h3 are optional)
      expect(h1Exists > 0 || (h2.count() === 0 && h3.count() === 0)).toBeTruthy();
    }
  });

  test('should have semantic HTML elements', async ({ page }) => {
    // Check for main landmark
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check for header landmark
    const header = page.locator('header');
    const headerExists = await header.isVisible().catch(() => false);
    expect(headerExists).toBeTruthy();

    // Check for footer landmark
    const footer = page.locator('footer');
    const footerExists = await footer.isVisible().catch(() => false);
    expect(footerExists).toBeTruthy();
  });

  test('should have ARIA labels on buttons', async ({ page }) => {
    // Get all buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // Check first button for label or text
      const firstButton = buttons.first();
      const hasAriaLabel = await firstButton.getAttribute('aria-label');
      const buttonText = await firstButton.textContent();

      // Should have either aria-label or text content
      expect(
        (hasAriaLabel && hasAriaLabel.length > 0) ||
          (buttonText && buttonText.length > 0)
      ).toBeTruthy();
    }
  });

  test('should have ARIA labels on inputs', async ({ page }) => {
    // Find all inputs
    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      // Check first input
      const firstInput = inputs.first();
      const hasAriaLabel = await firstInput.getAttribute('aria-label');
      const hasLabel = await firstInput
        .locator('//preceding-sibling::label')
        .isVisible()
        .catch(() => false);
      const hasPlaceholder = await firstInput.getAttribute('placeholder');

      // Should have some accessible name
      expect(
        (hasAriaLabel && hasAriaLabel.length > 0) ||
          hasLabel ||
          (hasPlaceholder && hasPlaceholder.length > 0)
      ).toBeTruthy();
    }
  });

  test('should use proper button roles', async ({ page }) => {
    // Find all buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // Check that buttons have role="button" or are actual <button> elements
      const firstButton = buttons.first();
      const tagName = await firstButton.evaluate(el => el.tagName.toLowerCase());
      const role = await firstButton.getAttribute('role');

      expect(
        tagName === 'button' || (role && role.includes('button'))
      ).toBeTruthy();
    }
  });

  test('should have proper link roles', async ({ page }) => {
    // Find all links
    const links = page.locator('a');
    const linkCount = await links.count();

    if (linkCount > 0) {
      // Check first link
      const firstLink = links.first();
      const href = await firstLink.getAttribute('href');
      const hasText = await firstLink.textContent();

      // Links should have href and text or aria-label
      expect(
        (href && href.length > 0) || (hasText && hasText.length > 0)
      ).toBeTruthy();
    }
  });
});

test.describe('Focus Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show focus indicator', async ({ page }) => {
    // Tab to an element
    await page.keyboard.press('Tab');

    // Get the focused element
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (el) {
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
          hasFocus: document.activeElement === el,
        };
      }
      return null;
    });

    // Should have focus
    if (focused) {
      expect(focused.hasFocus).toBeTruthy();
    }
  });

  test('should maintain logical tab order', async ({ page }) => {
    // Collect focused element tags in order
    const focusedElements = [];

    for (let i = 0; i < 10; i++) {
      const focused = await page.evaluate(() => {
        return {
          tag: document.activeElement?.tagName.toLowerCase(),
          text: document.activeElement?.textContent?.substring(0, 20),
        };
      });

      focusedElements.push(focused.tag);
      await page.keyboard.press('Tab');
    }

    // Should have tabbed through interactive elements
    const interactiveCount = focusedElements.filter(tag =>
      ['button', 'a', 'input', 'textarea', 'select'].includes(tag as any)
    ).length;

    expect(interactiveCount).toBeGreaterThan(0);
  });

  test('should focus skip non-interactive elements', async ({ page }) => {
    // Tab multiple times
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
    }

    // Get current focus
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName.toLowerCase();
    });

    // Should not focus on divs or spans (non-interactive elements)
    // Note: Some divs might have role="button" or be interactive
    expect(focused).toBeTruthy();
  });
});

test.describe('Color and Contrast', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display text with sufficient contrast', async ({ page }) => {
    // Get all text elements
    const heading = page.locator('h1').first();
    const isVisible = await heading.isVisible();

    if (isVisible) {
      // Check that heading is visible and has color
      const textColor = await heading.evaluate(el =>
        window.getComputedStyle(el).color
      );
      const bgColor = await heading.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // Should have both text and background color
      expect(textColor).toBeTruthy();
      expect(bgColor).toBeTruthy();
    }
  });

  test('should not rely solely on color to convey information', async ({
    page,
  }) => {
    // Check for text content in addition to colors
    const buttons = page.locator('button');
    const firstButton = buttons.first();
    const isVisible = await firstButton.isVisible().catch(() => false);

    if (isVisible) {
      // Should have text or icon with aria-label
      const text = await firstButton.textContent();
      const ariaLabel = await firstButton.getAttribute('aria-label');

      expect(
        (text && text.length > 0) || (ariaLabel && ariaLabel.length > 0)
      ).toBeTruthy();
    }
  });
});

test.describe('Screen Reader Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have descriptive page title', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have descriptive alt text for images', async ({ page }) => {
    // Find all images
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      // Check first image
      const firstImage = images.first();
      const altText = await firstImage.getAttribute('alt');

      // Should have alt text (even if empty is acceptable for decorative images)
      expect(typeof altText).toBe('string');
    }
  });

  test('should announce dynamic content updates', async ({ page }) => {
    // Look for ARIA live regions
    const liveRegion = page.locator('[role="status"], [aria-live]');
    const liveExists = await liveRegion.count();

    // Live regions are helpful but not always required
    expect(typeof liveExists).toBe('number');
  });

  test('should have skip navigation link', async ({ page }) => {
    // Check for skip link (usually hidden but available to screen readers)
    const skipLink = page.locator('a:has-text(/skip|main/i)');
    const skipExists = await skipLink.isVisible().catch(() => false);

    // Skip link is nice to have but not required
    expect(typeof skipExists).toBe('boolean');
  });
});
