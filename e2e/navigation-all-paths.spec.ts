// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Navigation Path Testing', () => {
  test('test all navigation links and verify active state highlighting', async ({
    page,
  }) => {
    // Navigate to News Cartoon home page to start navigation testing
    await page.goto('http://localhost:5173');

    // Verify Home navigation link is visible
    await expect(
      page.getByRole('link', { name: 'Navigate to Home page' }),
    ).toBeVisible();

    // Verify History navigation link is visible
    await expect(
      page.getByRole('link', { name: 'Navigate to History page' }),
    ).toBeVisible();

    // Verify Settings navigation link is visible
    await expect(
      page.getByRole('link', { name: 'Navigate to Settings page' }),
    ).toBeVisible();

    // Click History navigation link to navigate to History page
    await page.getByRole('link', { name: 'Navigate to History page' }).click();
    await expect(page).toHaveURL('http://localhost:5173/history');
    await expect(
      page.getByRole('link', { name: 'Navigate to History page' }),
    ).toHaveAttribute('aria-current', 'page');

    // Click Settings navigation link to navigate to Settings page
    await page.getByRole('link', { name: 'Navigate to Settings page' }).click();
    await expect(page).toHaveURL('http://localhost:5173/settings');
    await expect(
      page.getByRole('link', { name: 'Navigate to Settings page' }),
    ).toHaveAttribute('aria-current', 'page');

    // Click Home navigation link to navigate back to Home page
    await page.getByRole('link', { name: 'Navigate to Home page' }).click();
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(
      page.getByRole('link', { name: 'Navigate to Home page' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('test browser back and forward button navigation', async ({ page }) => {
    // Navigate to News Cartoon home page
    await page.goto('http://localhost:5173');

    // Click Settings link to navigate to Settings page first
    await page.getByRole('link', { name: 'Navigate to Settings page' }).click();
    await expect(page).toHaveURL('http://localhost:5173/settings');

    // Use JavaScript to trigger browser back button navigation
    await page.evaluate('() => { window.history.back(); }');
    await expect(page).toHaveURL('http://localhost:5173/');

    // Use JavaScript to trigger browser forward button navigation back to Settings
    await page.evaluate('() => { window.history.forward(); }');
    await expect(page).toHaveURL('http://localhost:5173/settings');
  });

  test('test direct URL navigation to all pages', async ({ page }) => {
    // Directly navigate to /history URL
    await page.goto('http://localhost:5173/history');
    await expect(page).toHaveURL('http://localhost:5173/history');
    await expect(page.getByRole('heading', { name: 'Cartoon History' })).toBeVisible();

    // Directly navigate to /settings URL
    await page.goto('http://localhost:5173/settings');
    await expect(page).toHaveURL('http://localhost:5173/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // Directly navigate to / (home) URL
    await page.goto('http://localhost:5173/');
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(
      page.getByRole('heading', { name: 'Search Keywords', level: 2 }),
    ).toBeVisible();
  });

  test('test workflow step navigation with Go To buttons', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:5173');

    // Enter search keyword 'technology' in the search field
    await page.getByRole('textbox', { name: 'Enter search keywords' }).fill('technology');

    // Click Search button to proceed to news results step
    await page.getByRole('button', { name: 'Set search keywords' }).click();

    // Verify we're at step 2 - News Articles
    await expect(page.getByRole('heading', { name: 'News Articles', level: 2 })).toBeVisible();

    // Click 'Go to location step' button to navigate back to step 1
    await page.getByRole('button', { name: 'Go to location step' }).click();
    await expect(
      page.getByRole('heading', { name: 'Search Keywords', level: 2 }),
    ).toBeVisible();

    // Click 'Next step' button to advance to News Articles step
    await page.getByRole('button', { name: 'Next step' }).click();
    await expect(page.getByRole('heading', { name: 'News Articles', level: 2 })).toBeVisible();
  });

  test('test article selection and workflow progression to concepts step', async ({
    page,
  }) => {
    // Navigate to home page
    await page.goto('http://localhost:5173');

    // Enter search keyword 'technology'
    await page.getByRole('textbox', { name: 'Enter search keywords' }).fill('technology');

    // Click Search button
    await page.getByRole('button', { name: 'Set search keywords' }).click();

    // Wait for articles to load and verify we're at step 2
    await expect(page.getByRole('heading', { name: 'News Articles', level: 2 })).toBeVisible();

    // Click checkbox to select the first article
    await page.getByRole('checkbox', { name: 'Select article: ICE eyes new' }).click();

    // Verify workflow advanced to step 3 - Generate Cartoon Concepts
    await expect(
      page.getByRole('heading', { name: 'Generate Cartoon Concepts', level: 2 }),
    ).toBeVisible();

    // Click 'Go to news step' button to navigate back to step 2
    await page.getByRole('button', { name: 'Go to news step' }).click();

    // Verify we returned to step 2
    await expect(page.getByRole('heading', { name: 'News Articles', level: 2 })).toBeVisible();
  });

  test('test navigation away from workflow and state preservation', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:5173');

    // Enter search keyword 'technology'
    await page.getByRole('textbox', { name: 'Enter search keywords' }).fill('technology');

    // Click Search button to go to step 2
    await page.getByRole('button', { name: 'Set search keywords' }).click();

    // Click Settings link while on workflow to test navigation away
    await page.getByRole('link', { name: 'Navigate to Settings page' }).click();
    await expect(page).toHaveURL('http://localhost:5173/settings');

    // Click Home link to return to home page
    await page.getByRole('link', { name: 'Navigate to Home page' }).click();

    // Verify workflow state is preserved - should still be at step 2
    await expect(page.getByRole('heading', { name: 'News Articles', level: 2 })).toBeVisible();
  });

  test('test invalid route redirects to 404 and navigation from 404', async ({
    page,
  }) => {
    // Navigate to invalid route to test error handling or fallback behavior
    await page.goto('http://localhost:5173/invalid-route');

    // Verify redirected to 404 page
    await expect(page).toHaveURL('http://localhost:5173/404');

    // Verify navigation links are still available
    await expect(
      page.getByRole('link', { name: 'Navigate to Home page' }),
    ).toBeVisible();

    // Click Home link from 404 error page
    await page.getByRole('link', { name: 'Navigate to Home page' }).click();
    await expect(page).toHaveURL('http://localhost:5173/');
  });

  test('test previous step button navigation', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:5173');

    // Enter search keyword
    await page.getByRole('textbox', { name: 'Enter search keywords' }).fill('technology');

    // Click Search button to go to step 2
    await page.getByRole('button', { name: 'Set search keywords' }).click();

    // Verify at step 2
    await expect(page.getByRole('heading', { name: 'News Articles', level: 2 })).toBeVisible();

    // Click Previous step button to go back to step 1
    await page.getByRole('button', { name: 'Previous step' }).click();

    // Verify we're back at step 1
    await expect(
      page.getByRole('heading', { name: 'Search Keywords', level: 2 }),
    ).toBeVisible();
  });

  test('test complex browser history sequence with multiple back and forward navigations', async ({
    page,
  }) => {
    // Navigate to home page
    await page.goto('http://localhost:5173');

    // Click History link
    await page.getByRole('link', { name: 'Navigate to History page' }).click();
    await expect(page).toHaveURL('http://localhost:5173/history');

    // Click Settings link
    await page.getByRole('link', { name: 'Navigate to Settings page' }).click();
    await expect(page).toHaveURL('http://localhost:5173/settings');

    // Go back from Settings to History
    await page.evaluate('() => { window.history.back(); }');
    await expect(page).toHaveURL('http://localhost:5173/history');

    // Go back from History to Home
    await page.evaluate('() => { window.history.back(); }');
    await expect(page).toHaveURL('http://localhost:5173/');

    // Go forward from Home to History
    await page.evaluate('() => { window.history.forward(); }');
    await expect(page).toHaveURL('http://localhost:5173/history');

    // Go forward from History to Settings
    await page.evaluate('() => { window.history.forward(); }');
    await expect(page).toHaveURL('http://localhost:5173/settings');
  });

  test('test header is present on all pages', async ({ page }) => {
    const pages = ['http://localhost:5173', 'http://localhost:5173/history', 'http://localhost:5173/settings'];

    for (const pageUrl of pages) {
      await page.goto(pageUrl);

      // Verify header is visible on all pages
      await expect(page.getByRole('heading', { name: 'NewsCartoon.lol', level: 1 })).toBeVisible();

      // Verify navigation is visible on all pages
      await expect(
        page.getByRole('link', { name: 'Navigate to Home page' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Navigate to History page' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Navigate to Settings page' }),
      ).toBeVisible();

      // Verify footer is visible on all pages
      await expect(page.getByText('© 2025 News Cartoon. All rights reserved.')).toBeVisible();
    }
  });
});
