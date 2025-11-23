
import { test, expect } from '@playwright/test';

test('navigate to gallery page', async ({ page }) => {
  await page.goto('/');
  
  // Check if Gallery link exists and click it
  const galleryLink = page.getByRole('link', { name: 'Gallery' });
  await expect(galleryLink).toBeVisible();
  await galleryLink.click();

  // Verify URL
  await expect(page).toHaveURL(/.*\/gallery/);
  
  // Verify heading
  await expect(page.getByRole('heading', { name: 'Cartoon Gallery' })).toBeVisible();
  
  // Verify "Create New" button exists
  await expect(page.getByRole('link', { name: 'Create New' })).toBeVisible();
});
