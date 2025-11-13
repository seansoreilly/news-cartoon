import { test, expect } from '@playwright/test';

test.describe('News Cartoon Application Navigation and Structure', () => {
  test('should test header, navigation, progress indicator, page structure, responsiveness, and error states', async ({ page }) => {
    // Navigate to News Cartoon application home page
    await page.goto('http://localhost:5173');

    // 1. Header & Navigation Testing - Verify NewsCartoon.lol title is visible
    await expect(page.getByRole('heading', { name: 'NewsCartoon.lol' })).toBeVisible();

    // 1. Header & Navigation Testing - Verify tagline displays correctly
    await expect(page.getByText('Generate editorial cartoons from news articles')).toBeVisible();

    // 1. Header & Navigation Testing - Verify Home navigation tab exists
    await expect(page.getByRole('link', { name: 'Navigate to Home page' })).toBeVisible();

    // 1. Header & Navigation Testing - Verify History navigation tab exists
    await expect(page.getByRole('link', { name: 'Navigate to History page' })).toBeVisible();

    // 1. Header & Navigation Testing - Verify Settings navigation tab exists
    await expect(page.getByRole('link', { name: 'Navigate to Settings page' })).toBeVisible();

    // 1. Header & Navigation Testing - Click History tab and verify navigation
    await page.getByRole('link', { name: 'Navigate to History page' }).click();

    // 1. Header & Navigation Testing - Verify History page loaded successfully
    await expect(page.getByRole('heading', { name: 'Cartoon History' })).toBeVisible();

    // 1. Header & Navigation Testing - Click Settings tab and verify navigation
    await page.getByRole('link', { name: 'Navigate to Settings page' }).click();

    // 1. Header & Navigation Testing - Verify Settings page loaded successfully
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // 1. Header & Navigation Testing - Click Home tab to return to home page
    await page.getByRole('link', { name: 'Navigate to Home page' }).click();

    // 1. Header & Navigation Testing - Test browser back button navigation
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // 1. Header & Navigation Testing - Test browser forward button navigation
    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Search Keywords' })).toBeVisible();

    // 2. Progress Indicator Testing - Verify step 1 'Set Location' exists
    await expect(page.getByText('Set Location')).toBeVisible();

    // 2. Progress Indicator Testing - Verify step 2 'Select News' exists
    await expect(page.getByText('Select News')).toBeVisible();

    // 2. Progress Indicator Testing - Verify step 3 'Generate Concepts' exists
    await expect(page.getByText('Generate Concepts')).toBeVisible();

    // 2. Progress Indicator Testing - Verify step 4 'Generate Image' exists
    await expect(page.getByText('Generate Image')).toBeVisible();

    // 3. Page Structure Testing - Verify footer with copyright year 2025
    await expect(page.getByText('© 2025 News Cartoon. All rights reserved.')).toBeVisible();

    // 4. Layout Responsiveness - Set viewport to mobile size (375px width)
    await page.setViewportSize({ width: 375, height: 667 });

    // 4. Layout Responsiveness - Verify layout works on mobile (375px)
    await expect(page.getByRole('heading', { name: 'NewsCartoon.lol' })).toBeVisible();

    // 4. Layout Responsiveness - Set viewport to tablet size (768px width)
    await page.setViewportSize({ width: 768, height: 1024 });

    // 4. Layout Responsiveness - Verify layout works on tablet (768px)
    await expect(page.getByRole('heading', { name: 'NewsCartoon.lol' })).toBeVisible();

    // 4. Layout Responsiveness - Set viewport to desktop size (1280px width)
    await page.setViewportSize({ width: 1280, height: 720 });

    // 4. Layout Responsiveness - Verify layout works on desktop (1280px)
    await expect(page.getByRole('heading', { name: 'NewsCartoon.lol' })).toBeVisible();

    // 5. Error Cases & Edge States - Navigate to invalid path to verify 404 page
    await page.goto('http://localhost:5173/invalid-path');

    // 5. Error Cases & Edge States - Verify 404 page displays for invalid path
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();

    // 5. Error Cases & Edge States - Verify 404 page content
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();

    // 5. Error Cases & Edge States - Navigate to history page before reload test
    await page.goto('http://localhost:5173/history');

    // 5. Error Cases & Edge States - Wait for history page to fully load
    await expect(page.getByText("Cartoon History").first()).toBeVisible();

    // 5. Error Cases & Edge States - Reload page and verify history page still displays
    await page.reload();
    await expect(page.getByText("Cartoon History").first()).toBeVisible();

    // 6. Loading & Performance - Navigate to home page to check load time and console
    await page.goto('http://localhost:5173/');

    // 6. Loading & Performance - Wait for home page to fully load
    await expect(page.getByText("Search Keywords").first()).toBeVisible();
  });
});
