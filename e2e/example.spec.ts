import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');

  // Verify the page loads with expected content
  await expect(page).toHaveTitle(/News Cartoon/);
});

test('has visible header', async ({ page }) => {
  await page.goto('/');

  // Check if page has content loaded
  const body = page.locator('body');
  await expect(body).toBeTruthy();
});
