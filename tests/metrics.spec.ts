import { test, expect } from './test-utils';

test.describe('Page Metrics', () => {
  test('should load the metrics page and display key elements', async ({ page }) => {
    await page.goto('/metrics');

    // Vérifier le titre de la page
    await expect(page.getByRole('heading', { name: /Advanced Metrics/i })).toBeVisible();

    // Vérifier la présence des boutons Export CSV et Refresh
    await expect(page.getByRole('button', { name: /Export CSV/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();

    // Vérifier la présence des sélecteurs
    await expect(page.getByLabel(/Time Range/i)).toBeVisible();
    await expect(page.getByLabel(/Nodes/i)).toBeVisible();
    await expect(page.getByLabel(/Metrics/i)).toBeVisible();
  });

  test('should interact with time range selector', async ({ page }) => {
    await page.goto('/metrics');
    await page.getByLabel('6 Hours').click();
    await expect(page.getByLabel('6 Hours')).toBeChecked();
  });

  test('should interact with nodes selector', async ({ page }) => {
    await page.goto('/metrics');
    await page.getByLabel('pve-2').check();
    await expect(page.getByLabel('pve-2')).toBeChecked();
  });

  test('should interact with metrics selector', async ({ page }) => {
    await page.goto('/metrics');
    await page.getByLabel('Storage Usage').check();
    await expect(page.getByLabel('Storage Usage')).toBeChecked();
  });
});