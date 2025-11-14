// spec: Interactive Elements and State Management Test
// Test all buttons, toggles, and state changes in News Cartoon application

import { test, expect } from '@playwright/test';

test.describe('Interactive Elements and State Management', () => {
  test('Test all interactive buttons and state management workflow', async ({ page }) => {
    // Navigate to News Cartoon application home page
    await page.goto('http://localhost:5173');
    await expect(page).toHaveTitle('News Cartoon');

    // Test 1: Enter search keywords to enable Search button
    const searchTextbox = page.getByRole('textbox', { name: 'Enter search keywords' });
    await searchTextbox.fill('technology');
    const searchButton = page.getByRole('button', { name: 'Set search keywords' });
    await expect(searchButton).toBeEnabled();

    // Test 2: Click Search button to fetch news articles
    await searchButton.click();
    await page.waitForTimeout(2000);
    
    // Verify news articles are loaded
    const newsHeading = page.getByRole('heading', { name: 'News Articles' });
    await expect(newsHeading).toBeVisible();

    // Test 3: Click to select first news article checkbox
    const firstArticleButton = page.getByRole('button', { name: 'Select article: ICE eyes new' });
    await firstArticleButton.click();
    
    // Verify concept generation step is available
    const generateConceptsButton = page.getByRole('button', { name: 'Generate Cartoon Concepts' });
    await expect(generateConceptsButton).toBeVisible();

    // Test 4: Click Generate Cartoon Concepts button and verify loading state
    await generateConceptsButton.click();
    await page.waitForTimeout(3000);
    
    // Verify concepts were generated
    const conceptsHeading = page.getByRole('heading', { name: 'Cartoon Concepts' });
    await expect(conceptsHeading).toBeVisible();

    // Test 5: Click first concept to select it
    const firstConcept = page.getByRole('button', { name: /Lost in Translation An/ }).first();
    await firstConcept.click();
    
    // Verify concept is selected with "Selected" badge
    const selectedBadge = page.getByText('Selected');
    await expect(selectedBadge).toBeVisible();

    // Test 6 & 8 & 9: Test panel count selector - verify buttons exist and are clickable
    const panelButton2 = page.getByRole('button', { name: '2', exact: true });
    const panelButton3 = page.getByRole('button', { name: '3', exact: true });
    
    // Click panel 2
    await panelButton2.click();
    await expect(panelButton2).toHaveAttribute('aria-pressed', 'true');
    
    // Click panel 3
    await panelButton3.click();
    await expect(panelButton3).toHaveAttribute('aria-pressed', 'true');

    // Test 10: Click Generate Cartoon Script button and observe loading state
    const generateScriptButton = page.getByRole('button', { name: 'Generate cartoon script' });
    await generateScriptButton.click();
    
    // Wait for script to generate
    await page.waitForTimeout(3000);
    
    // Verify script generation completed
    const generateCartoonButton = page.getByRole('button', { name: 'Generate Cartoon' });
    await expect(generateCartoonButton).toBeVisible();

    // Test 11: Click Generate Cartoon button and observe image generation loading state
    await generateCartoonButton.click();
    
    // Verify button is disabled during generation
    await expect(generateCartoonButton).toBeDisabled();
    
    // Wait for image generation to complete
    await page.waitForTimeout(15000);
    
    // Verify cartoon was generated
    const cartoonImage = page.locator('img').filter({ hasText: /Lost in Translation|Translation/ }).first();
    await expect(cartoonImage).toBeVisible();

    // Test 12: Click Download Cartoon button to test download functionality
    const downloadButton = page.getByRole('button', { name: 'Download Cartoon' });
    await expect(downloadButton).toBeVisible();
    
    // Intercept and verify download
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('cartoon');

    // Test 13: Click Generate New Cartoon button to regenerate with same concept
    const generateNewButton = page.getByRole('button', { name: 'Generate New Cartoon' });
    await expect(generateNewButton).toBeVisible();
    await generateNewButton.click();
    
    // Verify state reset - button should be enabled again
    await expect(generateCartoonButton).toBeEnabled();
    
    // Verify concept description is still visible
    const conceptTitle = page.getByRole('heading', { name: /Selected Concept/ });
    await expect(conceptTitle).toBeVisible();

    // Test 14 & 15: Test Regenerate Concepts button
    const conceptsStepButton = page.getByRole('button', { name: 'Go to concepts step' });
    await conceptsStepButton.click();
    
    const regenerateButton = page.getByRole('button', { name: 'Regenerate Concepts' });
    await expect(regenerateButton).toBeVisible();
    await regenerateButton.click();
    
    // Wait for new concepts
    await page.waitForTimeout(5000);
    
    // Verify new concepts are displayed
    await conceptsStepButton.click();
    const newConceptsHeading = page.getByRole('heading', { name: 'Cartoon Concepts' });
    await expect(newConceptsHeading).toBeVisible();

    // Test 16 & 17: Verify concepts were regenerated and select different one
    const secondConcept = page.getByRole('button', { name: /Data Dump An ancient Roman/ }).first();
    await expect(secondConcept).toBeVisible();
    await secondConcept.click();
    
    // Verify new concept is selected
    const newSelectedBadge = page.getByText('Selected');
    await expect(newSelectedBadge).toBeVisible();

    // Test 18: Refresh page to test state persistence
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Verify state persisted after refresh
    const persistedConceptsStep = page.getByRole('button', { name: 'Go to concepts step' });
    await expect(persistedConceptsStep).toBeVisible();
    
    // Verify the selected concept is still there
    const persistedSelectedBadge = page.getByText('Selected');
    await expect(persistedSelectedBadge).toBeVisible();

    // Test 19: Test hover effect on concept button (verify element is interactive)
    const hoverableButton = page.getByRole('button', { name: /The Algorithm/ }).first();
    await hoverableButton.hover();
    await expect(hoverableButton).toHaveCSS('cursor', 'pointer');

    // Test 20 & 21: Navigate to news step and test Refresh news button
    const newsStepButton = page.getByRole('button', { name: 'Go to news step' });
    await newsStepButton.click();
    await page.waitForTimeout(2000);
    
    const refreshButton = page.getByRole('button', { name: 'Refresh news' });
    await expect(refreshButton).toBeVisible();
    
    // Click refresh
    await refreshButton.click();
    
    // Verify button shows loading state
    await expect(refreshButton).toBeDisabled();
    
    // Wait for refresh to complete
    await page.waitForTimeout(5000);
    
    // Verify button is enabled again
    await expect(refreshButton).toBeEnabled();
    
    // Verify articles are still displayed
    const refreshedArticles = page.getByRole('heading', { name: 'News Articles' });
    await expect(refreshedArticles).toBeVisible();
  });

  test('Test button disabled states', async ({ page }) => {
    // Navigate to home
    await page.goto('http://localhost:5173');
    
    // Search button should be disabled initially
    const searchButton = page.getByRole('button', { name: 'Set search keywords' });
    await expect(searchButton).toBeDisabled();
    
    // Fill keywords
    const searchTextbox = page.getByRole('textbox', { name: 'Enter search keywords' });
    await searchTextbox.fill('test');
    
    // Button should now be enabled
    await expect(searchButton).toBeEnabled();
  });

  test('Test concept carousel navigation', async ({ page }) => {
    // Navigate and setup
    await page.goto('http://localhost:5173');
    const searchTextbox = page.getByRole('textbox', { name: 'Enter search keywords' });
    await searchTextbox.fill('technology');
    const searchButton = page.getByRole('button', { name: 'Set search keywords' });
    await searchButton.click();
    await page.waitForTimeout(2000);
    
    // Select first article
    const firstArticleButton = page.getByRole('button', { name: 'Select article: ICE eyes new' });
    await firstArticleButton.click();
    
    // Generate concepts
    const generateConceptsButton = page.getByRole('button', { name: 'Generate Cartoon Concepts' });
    await generateConceptsButton.click();
    await page.waitForTimeout(3000);
    
    // Test concept navigation buttons
    const conceptButtons = page.getByRole('button', { name: /View concept/ });
    const count = await conceptButtons.count();
    expect(count).toBeGreaterThan(0);
    
    // Click different concepts
    for (let i = 0; i < Math.min(3, count); i++) {
      const button = conceptButtons.nth(i);
      await button.click();
      await page.waitForTimeout(500);
      const selectedBadge = page.getByText('Selected');
      await expect(selectedBadge).toBeVisible();
    }
  });

  test('Test panel count selector state persistence', async ({ page }) => {
    // Navigate and setup
    await page.goto('http://localhost:5173');
    const searchTextbox = page.getByRole('textbox', { name: 'Enter search keywords' });
    await searchTextbox.fill('technology');
    const searchButton = page.getByRole('button', { name: 'Set search keywords' });
    await searchButton.click();
    await page.waitForTimeout(2000);
    
    // Select first article
    const firstArticleButton = page.getByRole('button', { name: 'Select article: ICE eyes new' });
    await firstArticleButton.click();
    
    // Generate concepts
    const generateConceptsButton = page.getByRole('button', { name: 'Generate Cartoon Concepts' });
    await generateConceptsButton.click();
    await page.waitForTimeout(3000);
    
    // Test panel count selector - select 4
    const panelButton4 = page.getByRole('button', { name: '4', exact: true });
    await panelButton4.click();
    await expect(panelButton4).toHaveAttribute('aria-pressed', 'true');
    
    // Verify other buttons are not active
    const panelButton1 = page.getByRole('button', { name: '1', exact: true });
    await expect(panelButton1).not.toHaveAttribute('aria-pressed', 'true');
  });
});
