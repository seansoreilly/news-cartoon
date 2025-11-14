// spec: Test all forms and inputs in News Cartoon application
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Forms and Inputs Testing', () => {
  test('Search keyword input field validation', async ({ page }) => {
    // Navigate to News Cartoon application
    await page.goto('http://localhost:5173');

    // Verify search button is disabled with empty field
    const searchButton = page.getByRole('button', { name: 'Set search keywords' });
    await expect(searchButton).toBeDisabled();

    // Test 1: Enter valid search keyword and verify button becomes enabled
    const searchInput = page.getByRole('textbox', { name: 'Enter search keywords' });
    await searchInput.fill('technology');
    await expect(searchButton).toBeEnabled();

    // Verify search input field contains the typed text
    await expect(searchInput).toHaveValue('technology');
  });

  test('Search input field with special characters', async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:5173');
    const searchInput = page.getByRole('textbox', { name: 'Enter search keywords' });

    // Test special characters in search input field
    await searchInput.fill('@#$%^&*()');
    await expect(searchInput).toHaveValue('@#$%^&*()');

    // Verify button is still enabled with special characters
    const searchButton = page.getByRole('button', { name: 'Set search keywords' });
    await expect(searchButton).toBeEnabled();
  });

  test('Search input field with very long string', async ({ page } ) => {
    // Navigate to application
    await page.goto('http://localhost:5173');
    const searchInput = page.getByRole('textbox', { name: 'Enter search keywords' });

    // Test very long input string handling
    const longString = 'This is a very long search query that exceeds normal length to test the input field maximum length handling and ensure the application can handle extended strings without crashing or breaking the UI layout';
    await searchInput.fill(longString);
    await expect(searchInput).toHaveValue(longString);

    // Verify button is enabled
    const searchButton = page.getByRole('button', { name: 'Set search keywords' });
    await expect(searchButton).toBeEnabled();
  });

  test('Search form submission with valid keyword', async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:5173');
    const searchInput = page.getByRole('textbox', { name: 'Enter search keywords' });
    const searchButton = page.getByRole('button', { name: 'Set search keywords' });

    // Enter a valid search term
    await searchInput.fill('sports');

    // Submit search form with valid keyword
    await searchButton.click();

    // Verify page navigates to news articles step (heading appears)
    await expect(page.getByRole('heading', { name: 'News Articles' })).toBeVisible();
  });

  test('News article checkbox selection and deselection', async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:5173');
    const searchInput = page.getByRole('textbox', { name: 'Enter search keywords' });
    const searchButton = page.getByRole('button', { name: 'Set search keywords' });

    // Perform search to get articles
    await searchInput.fill('sports');
    await searchButton.click();

    // Wait for articles to load
    await expect(page.getByRole('heading', { name: 'News Articles' })).toBeVisible();

    // Get first checkbox
    const firstCheckbox = page.locator('input[type="checkbox"]').first();

    // Select the first article checkbox
    await firstCheckbox.click();
    await expect(firstCheckbox).toBeChecked();

    // Verify selection count appears
    const selectedText = page.locator('text=/selected/i').first();
    await expect(selectedText).toContainText('1');

    // Deselect the checkbox
    await firstCheckbox.click();
    await expect(firstCheckbox).not.toBeChecked();
  });

  test('Input field focus state', async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:5173');
    const searchInput = page.getByRole('textbox', { name: 'Enter search keywords' });

    // Click on input to focus
    await searchInput.click();

    // Verify input is focused
    await expect(searchInput).toBeFocused();

    // Test text entry while focused
    await searchInput.type('focused text');
    await expect(searchInput).toHaveValue('focused text');
  });

  test('Input field clearing via keyboard', async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:5173');
    const searchInput = page.getByRole('textbox', { name: 'Enter search keywords' });

    // Enter text
    await searchInput.fill('politics');
    await expect(searchInput).toHaveValue('politics');

    // Select all text
    await searchInput.click();
    await page.keyboard.press('Control+a');

    // Delete selected text
    await page.keyboard.press('Delete');
    await expect(searchInput).toHaveValue('');

    // Verify button is disabled when field is empty
    const searchButton = page.getByRole('button', { name: 'Set search keywords' });
    await expect(searchButton).toBeDisabled();
  });

  test('Settings - Default Location input and save', async ({ page }) => {
    // Navigate to Settings page
    await page.goto('http://localhost:5173/settings');

    // Get location input and save button
    const locationInput = page.getByRole('textbox', { name: 'Default Location' });
    const saveButton = page.getByRole('button', { name: 'Save' }).first();

    // Verify save button is disabled initially
    await expect(saveButton).toBeDisabled();

    // Enter a location
    await locationInput.fill('San Francisco, CA');

    // Verify save button becomes enabled
    await expect(saveButton).toBeEnabled();

    // Click save
    await saveButton.click();

    // Verify success message appears
    await expect(page.locator('text=/saved successfully/i')).toBeVisible();
  });

  test('Settings - Clear location preference', async ({ page }) => {
    // Navigate to Settings page
    await page.goto('http://localhost:5173/settings');

    // Get location input
    const locationInput = page.getByRole('textbox', { name: 'Default Location' });

    // First save a location
    await locationInput.fill('New York, NY');
    const saveButton = page.getByRole('button', { name: 'Save' }).first();
    await saveButton.click();
    await expect(page.locator('text=/saved successfully/i')).toBeVisible();

    // Now clear it
    const clearButton = page.getByRole('button', { name: 'Clear saved location' });
    await expect(clearButton).toBeEnabled();
    await clearButton.click();

    // Verify cleared message and field is empty
    await expect(page.locator('text=/cleared successfully/i')).toBeVisible();
    await expect(locationInput).toHaveValue('');
  });

  test('Settings - Dark Mode checkbox toggle', async ({ page }) => {
    // Navigate to Settings page
    await page.goto('http://localhost:5173/settings');

    // Get all checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const darkModeCheckbox = checkboxes.first();

    // Verify initial state
    const initialState = await darkModeCheckbox.isChecked();

    // Toggle dark mode checkbox
    await darkModeCheckbox.click();

    // Verify state changed
    const newState = await darkModeCheckbox.isChecked();
    expect(newState).toBe(!initialState);

    // Toggle back
    await darkModeCheckbox.click();
    expect(await darkModeCheckbox.isChecked()).toBe(initialState);
  });

  test('Settings - Auto-refresh News checkbox toggle', async ({ page }) => {
    // Navigate to Settings page
    await page.goto('http://localhost:5173/settings');

    // Get all checkboxes and select the second one (Auto-refresh)
    const checkboxes = page.locator('input[type="checkbox"]');
    const autoRefreshCheckbox = checkboxes.nth(1);

    // Verify initial state
    const initialState = await autoRefreshCheckbox.isChecked();

    // Toggle auto-refresh checkbox
    await autoRefreshCheckbox.click();

    // Verify state changed
    const newState = await autoRefreshCheckbox.isChecked();
    expect(newState).toBe(!initialState);

    // Toggle back
    await autoRefreshCheckbox.click();
    expect(await autoRefreshCheckbox.isChecked()).toBe(initialState);
  });

  test('Settings - Number of News Articles slider', async ({ page }) => {
    // Navigate to Settings page
    await page.goto('http://localhost:5173/settings');

    // Get the slider
    const slider = page.locator('input[type="range"]');

    // Get initial value
    const initialValue = await slider.inputValue();
    expect(initialValue).toBe('10');

    // Drag slider to change value
    const boundingBox = await slider.boundingBox();
    if (boundingBox) {
      // Move slider right to increase value
      await page.mouse.move(boundingBox.x + boundingBox.width * 0.8, boundingBox.y + boundingBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(boundingBox.x + boundingBox.width * 0.9, boundingBox.y + boundingBox.height / 2);
      await page.mouse.up();

      // Verify value changed
      const newValue = await slider.inputValue();
      expect(parseInt(newValue) > parseInt(initialValue)).toBeTruthy();
    }
  });

  test('Location detection button shows loading state', async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:5173');

    // Get location detection button
    const locationButton = page.getByRole('button', { name: /Detect my location/ });

    // Click location detection button
    await locationButton.click();

    // Verify button shows loading state (disabled and text changes)
    await expect(locationButton).toBeDisabled();
    const buttonText = await locationButton.textContent();
    expect(buttonText).toContain('Detecting');
  });

  test('Change search keywords navigation flow', async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:5173');

    // Enter and submit initial search
    const searchInput = page.getByRole('textbox', { name: 'Enter search keywords' });
    const searchButton = page.getByRole('button', { name: 'Set search keywords' });

    await searchInput.fill('technology');
    await searchButton.click();

    // Wait for news step to appear
    await expect(page.getByRole('heading', { name: 'News Articles' })).toBeVisible();

    // Click to go back to location step
    const locationStepButton = page.getByRole('button', { name: /Go to location step/ });
    await locationStepButton.click();

    // Verify we're back at the search keywords step
    await expect(page.getByRole('heading', { name: 'Search Keywords' })).toBeVisible();

    // Click Change button
    const changeButton = page.getByRole('button', { name: 'Change search keywords' });
    await changeButton.click();

    // Verify we can enter new search keywords
    const newSearchInput = page.getByRole('textbox', { name: 'Enter search keywords' });
    await expect(newSearchInput).toBeEmpty();
  });

  test('Multi-step form navigation with Previous and Next buttons', async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:5173');

    // Step 1: Enter search keywords
    const searchInput = page.getByRole('textbox', { name: 'Enter search keywords' });
    const searchButton = page.getByRole('button', { name: 'Set search keywords' });

    await searchInput.fill('business');
    await searchButton.click();

    // Wait for news articles to load
    await expect(page.getByRole('heading', { name: 'News Articles' })).toBeVisible();

    // Verify Previous button is visible
    const previousButton = page.getByRole('button', { name: /Previous step/ });
    await expect(previousButton).toBeVisible();

    // Click Previous to go back
    await previousButton.click();

    // Verify we're back at step 1
    const heading = page.getByRole('heading', { name: 'Search Keywords' });
    await expect(heading).toBeVisible();
  });

  test('Form elements respond to empty state validation', async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:5173');

    // Search button should be disabled with empty field
    const searchButton = page.getByRole('button', { name: 'Set search keywords' });
    await expect(searchButton).toBeDisabled();

    // Enter text to enable
    const searchInput = page.getByRole('textbox', { name: 'Enter search keywords' });
    await searchInput.fill('test');
    await expect(searchButton).toBeEnabled();

    // Clear field to disable again
    await searchInput.clear();
    await expect(searchButton).toBeDisabled();
  });
});
