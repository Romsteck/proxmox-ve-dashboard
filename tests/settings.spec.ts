import { test, expect } from '@playwright/test';

test.describe('Page Settings', () => {
  test('should load the settings page and display key elements', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Save Changes/i })).toBeVisible();
    await expect(page.getByLabel(/Theme/i)).toBeVisible();
    await expect(page.getByLabel(/Language/i)).toBeVisible();
    await expect(page.getByLabel(/Enable automatic refresh/i)).toBeVisible();
  });

  test('should change theme and language', async ({ page }) => {
    await page.goto('/settings');

    const themeSelector = page.getByLabel(/Theme/i);
    await themeSelector.selectOption('dark');
    await expect(themeSelector).toHaveValue('dark');

    const languageSelector = page.getByLabel(/Language/i);
    await languageSelector.selectOption('fr');
    await expect(languageSelector).toHaveValue('fr');
  });

  test('should toggle automatic refresh', async ({ page }) => {
    await page.goto('/settings');
    const autoRefreshCheckbox = page.getByLabel(/Enable automatic refresh/i);
    await autoRefreshCheckbox.uncheck();
    await expect(autoRefreshCheckbox).not.toBeChecked();
  });

  test('should save and discard changes', async ({ page }) => {
    await page.goto('/settings');

    const themeSelector = page.getByLabel(/Theme/i);
    await themeSelector.selectOption('light');

    await page.getByRole('button', { name: /Save Changes/i }).click();
    await page.reload();
    await expect(themeSelector).toHaveValue('light');

    await themeSelector.selectOption('dark');
    await page.getByRole('button', { name: /Discard/i }).click();
    await expect(themeSelector).toHaveValue('light');
  });
});